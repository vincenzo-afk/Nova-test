import type {
  ObservationIndexRequest,
  ObservationIndexResult,
  ObservationIndexer,
} from "@nova/memory";
import {
  InMemoryCommunicationBus,
  err,
  ok,
  type Result,
  type StructuredLogger,
} from "@nova/shared";
import {
  BrowserObserver,
  NativeBrowserEventBridge,
  type NativeBrowserEvent,
  type NativeBrowserEventBridgeContract,
  type BrowserObserverState,
  ClipboardObserver,
  NativeClipboardEventBridge,
  type NativeClipboardEventBridgeContract,
  NativeNotificationEventBridge,
  NotificationObserver,
  type NativeNotificationEventBridgeContract,
  NativeWindowsEventBridge,
  type NativeWindowsEventBridgeContract,
  WindowsApplicationObserver,
  type WindowsObserverState,
  type ClipboardObserverState,
  type NotificationObserverState,
} from "@nova/observers";
import { WorldModel } from "@nova/state";
import { LocalApiTokenIssuer, PublicApiServer, type PublicApiServerOptions } from "./rest-api.js";
import { ConfigurationStore, type NovaConfiguration } from "./configuration-store.js";
import {
  RuntimeTaskCoordinator,
  type TaskCheckpointPersistence,
} from "./runtime-task-coordinator.js";
import { TaskManager } from "./task-manager.js";
import { PermissionGrantStore } from "./permission-grant-store.js";
import type { TaskScheduler } from "./task-scheduler.js";
import type {
  ExecutionResult,
  ExecutionStep,
  Executor,
  Planner,
  Verifier,
  VerificationVerdict,
} from "./orchestration.js";
import { ToolRegistry, type RegisteredTool } from "./tool-registry.js";
import type { TaskRecord } from "./task-manager.js";
import { WebhookManager } from "./webhook-manager.js";
import {
  CommunicationBusEventJournal,
  PublicWebSocketServer,
  type PublicWebSocketServerOptions,
} from "./websocket-api.js";

export interface TaskRecoveryPersistence {
  recoverAfterCrash(): Promise<Result<readonly TaskRecord[]>>;
}

export interface RuntimeApplicationOptions {
  readonly configuration: NovaConfiguration;
  readonly planner: Planner;
  readonly executor: Executor;
  readonly verifier: Verifier;
  readonly host?: string;
  readonly restPort?: number;
  readonly websocketPort?: number;
  readonly taskManager?: TaskManager;
  readonly permissionStore?: PermissionGrantStore;
  readonly persistence?: TaskCheckpointPersistence & TaskRecoveryPersistence;
  readonly scheduler?: TaskScheduler;
  readonly dispose?: () => Promise<void>;
  readonly webhookManager?: WebhookManager;
  readonly authorizeTopics?: PublicWebSocketServerOptions["authorizeTopics"];
  readonly windowObserverBridge?: NativeWindowsEventBridgeContract;
  readonly clipboardObserverBridge?: NativeClipboardEventBridgeContract;
  readonly notificationObserverBridge?: NativeNotificationEventBridgeContract;
  readonly browserObserverBridge?: NativeBrowserEventBridgeContract;
  readonly browserExcludedDomains?: readonly string[];
  readonly observationIndexer?: ObservationIndexer;
  readonly registeredTools?: readonly RegisteredTool[];
  readonly logger?: StructuredLogger;
}

export class RuntimeApplication {
  public readonly tokenIssuer: LocalApiTokenIssuer;
  public readonly tasks: TaskManager;
  public readonly permissions: PermissionGrantStore;
  public readonly configuration: ConfigurationStore;
  public readonly events: CommunicationBusEventJournal;
  public readonly webhook: WebhookManager;
  public readonly coordinator: RuntimeTaskCoordinator;
  public readonly scheduler: TaskScheduler | undefined;
  public readonly rest: PublicApiServer;
  public readonly websocket: PublicWebSocketServer;
  public readonly windowsObserver: WindowsApplicationObserver;
  public readonly clipboardObserver: ClipboardObserver;
  public readonly notificationObserver: NotificationObserver;
  public readonly browserObserver: BrowserObserver;
  public readonly worldModel: WorldModel;
  public readonly observationIndexer: ObservationIndexer | undefined;
  public readonly toolRegistry: ToolRegistry;
  private readonly executor: Executor;
  private readonly verifier: Verifier;
  private readonly optionsPersistence: RuntimeApplicationOptions["persistence"];
  private readonly dispose: RuntimeApplicationOptions["dispose"];
  private readonly logger: StructuredLogger | undefined;

  public constructor(options: RuntimeApplicationOptions) {
    this.optionsPersistence = options.persistence;
    this.dispose = options.dispose;
    this.logger = options.logger;
    const bus = new InMemoryCommunicationBus(this.logger);
    this.executor = options.executor;
    this.verifier = options.verifier;
    this.toolRegistry = new ToolRegistry();
    for (const tool of options.registeredTools ?? []) {
      const registration = this.toolRegistry.register(tool);
      if (!registration.ok) throw new Error(registration.error.message);
    }
    this.observationIndexer = options.observationIndexer;
    this.tokenIssuer = new LocalApiTokenIssuer();
    this.tasks = options.taskManager ?? new TaskManager();
    this.permissions = options.permissionStore ?? new PermissionGrantStore({ initial: [] });
    const initialConfiguration =
      options.browserExcludedDomains === undefined
        ? options.configuration
        : {
            ...options.configuration,
            permissions: {
              ...options.configuration.permissions,
              browser_excluded_domains: options.browserExcludedDomains,
            },
          };
    this.configuration = new ConfigurationStore({ initial: initialConfiguration });
    this.events = new CommunicationBusEventJournal(bus);
    this.worldModel = new WorldModel();
    this.worldModel.attach(bus);
    this.windowsObserver = new WindowsApplicationObserver({
      permissions: this.permissions,
      bridge: options.windowObserverBridge ?? new NativeWindowsEventBridge(),
      bus,
    });
    this.clipboardObserver = new ClipboardObserver({
      permissions: this.permissions,
      bridge: options.clipboardObserverBridge ?? new NativeClipboardEventBridge(),
      bus,
    });
    this.notificationObserver = new NotificationObserver({
      permissions: this.permissions,
      bridge: options.notificationObserverBridge ?? new NativeNotificationEventBridge(),
      bus,
    });
    this.browserObserver = new BrowserObserver({
      permissions: this.permissions,
      bridge: options.browserObserverBridge ?? new NativeBrowserEventBridge(),
      bus,
      excludedDomains: this.configuration.snapshot().permissions.browser_excluded_domains ?? [],
    });
    this.configuration.subscribe((configuration) => {
      this.browserObserver.setExcludedDomains(
        configuration.permissions.browser_excluded_domains ?? [],
      );
    });
    this.webhook = options.webhookManager ?? new WebhookManager({});
    this.coordinator = new RuntimeTaskCoordinator({
      tasks: this.tasks,
      planner: options.planner,
      executor: options.executor,
      verifier: options.verifier,
      events: bus,
      ...(options.persistence === undefined ? {} : { persistence: options.persistence }),
    });
    this.scheduler = options.scheduler;
    this.rest = new PublicApiServer(this.restOptions(options));
    this.websocket = new PublicWebSocketServer({
      tokenIssuer: this.tokenIssuer,
      events: this.events,
      ...(options.host === undefined ? {} : { host: options.host }),
      ...(options.websocketPort === undefined ? {} : { port: options.websocketPort }),
      authorizeTopics:
        options.authorizeTopics ??
        (({ topics }) => topics.every((topic) => topic === "task.progress")),
    });
  }

  public async start(): Promise<void> {
    this.logger?.info("runtime.start.begin", {
      persistence_enabled: this.optionsPersistence !== undefined,
    });
    if (this.optionsPersistence) {
      const recovered = await this.optionsPersistence.recoverAfterCrash();
      if (!recovered.ok) {
        this.logger?.error("runtime.recovery.failed", { error_code: recovered.error.code });
        throw new Error(recovered.error.message);
      }
      this.tasks.restore(recovered.value);
      this.logger?.info("runtime.recovery.completed", {
        recovered_task_count: recovered.value.length,
      });
    }
    const observers = await this.syncObservers();
    if (!observers.ok) {
      this.logger?.error("runtime.observers.sync_failed", { error_code: observers.error.code });
      throw new Error(observers.error.message);
    }
    await this.rest.start();
    try {
      await this.websocket.start();
      this.logger?.info("runtime.started", { observer_state: observers.value });
    } catch (cause) {
      this.logger?.error("runtime.start.failed", { component: "websocket" });
      await this.rest.stop();
      throw cause;
    }
  }

  public async stop(): Promise<void> {
    this.logger?.info("runtime.stop.begin", {});
    try {
      if (this.windowsObserver.state() !== "Disabled") await this.windowsObserver.revoke();
      if (this.clipboardObserver.state() !== "Disabled") await this.clipboardObserver.revoke();
      if (this.notificationObserver.state() !== "Disabled")
        await this.notificationObserver.revoke();
      if (this.browserObserver.state() !== "Disabled") await this.browserObserver.revoke();
      this.worldModel.detach();
      await this.websocket.stop();
      await this.rest.stop();
      this.logger?.info("runtime.stopped", {});
    } catch (cause) {
      this.logger?.error("runtime.stop.failed", { component: "runtime" });
      throw cause;
    } finally {
      await this.dispose?.();
    }
  }

  public async executeToolStep(
    input: ExecutionStep,
  ): Promise<
    Result<{ readonly execution: ExecutionResult; readonly verification: VerificationVerdict }>
  > {
    this.logger?.info(
      "runtime.task_step.begin",
      {
        task_id: input.task_id,
        step_id: input.step_id,
        tool_id: input.resolved_tool_id,
        action_id: input.action_id,
      },
      input.correlation_id,
    );
    const execution = await this.executor.execute(input);
    if (!execution.ok) {
      this.logger?.warning(
        "runtime.task_step.execution_rejected",
        { step_id: input.step_id, error_code: execution.error.code },
        input.correlation_id,
      );
      return execution;
    }
    const verification = this.verifier.verify(input, execution.value);
    if (!verification.ok) {
      this.logger?.error(
        "runtime.task_step.verification_failed",
        { step_id: input.step_id, error_code: verification.error.code },
        input.correlation_id,
      );
      return verification;
    }
    this.logger?.info(
      "runtime.task_step.completed",
      {
        step_id: input.step_id,
        execution_status: execution.value.status,
        verification_outcome: verification.value.outcome,
      },
      input.correlation_id,
    );
    return ok({ execution: execution.value, verification: verification.value });
  }

  public async adoptObservation(
    request: ObservationIndexRequest,
  ): Promise<Result<ObservationIndexResult>> {
    this.logger?.debug(
      "runtime.observation.adoption_begin",
      { task_id: request.task_id, topic: request.event.topic },
      request.event.correlation_id,
    );
    if (!this.observationIndexer) {
      this.logger?.warning(
        "runtime.observation.adoption_rejected",
        { topic: request.event.topic, error_code: "NOVA-MEM001" },
        request.event.correlation_id,
      );
      return err({
        code: "NOVA-MEM001",
        message: "Observation indexing is not configured for this runtime.",
        retryable: true,
      });
    }
    const result = await this.observationIndexer.index(request);
    this.logger?.info(
      result.ok ? "runtime.observation.adopted" : "runtime.observation.adoption_failed",
      {
        topic: request.event.topic,
        ...(result.ok
          ? result.value.persisted
            ? { memory_id: result.value.memory_id }
            : { persisted: false }
          : { error_code: result.error.code }),
      },
      request.event.correlation_id,
    );
    return result;
  }

  public async syncObservers(): Promise<Result<WindowsObserverState>> {
    const browser = await this.syncBrowserObserver();
    if (!browser.ok) return err(browser.error);
    const clipboard = await this.syncClipboardObserver();
    if (!clipboard.ok) return err(clipboard.error);
    const notifications = await this.syncNotificationObserver();
    if (!notifications.ok) return err(notifications.error);
    const grants = new Map(this.permissions.list().map((grant) => [grant.source, grant.granted]));
    const permitted = grants.get("applications") === true && grants.get("windows") === true;
    if (!permitted) {
      if (this.windowsObserver.state() !== "Disabled") return await this.windowsObserver.revoke();
      return ok("Disabled");
    }
    if (this.windowsObserver.state() === "Disabled") return await this.windowsObserver.enable();
    return ok(this.windowsObserver.state());
  }

  public async syncClipboardObserver(): Promise<Result<ClipboardObserverState>> {
    const metadataGranted = this.permissions
      .list()
      .some((grant) => grant.source === "clipboard_metadata" && grant.granted);
    if (!metadataGranted) {
      if (this.clipboardObserver.state() !== "Disabled")
        return await this.clipboardObserver.revoke();
      return ok("Disabled");
    }
    if (this.clipboardObserver.state() === "Disabled") return await this.clipboardObserver.enable();
    return ok(this.clipboardObserver.state());
  }

  public async syncNotificationObserver(): Promise<Result<NotificationObserverState>> {
    const metadataGranted = this.permissions
      .list()
      .some((grant) => grant.source === "notifications_metadata" && grant.granted);
    if (!metadataGranted) {
      if (this.notificationObserver.state() !== "Disabled")
        return await this.notificationObserver.revoke();
      return ok("Disabled");
    }
    if (this.notificationObserver.state() === "Disabled")
      return await this.notificationObserver.enable();
    return ok(this.notificationObserver.state());
  }

  public async syncBrowserObserver(): Promise<Result<BrowserObserverState>> {
    const metadataGranted = this.permissions
      .list()
      .some((grant) => grant.source === "browser_metadata" && grant.granted);
    if (!metadataGranted) {
      if (this.browserObserver.state() !== "Disabled") return await this.browserObserver.revoke();
      return ok("Disabled");
    }
    if (this.browserObserver.state() === "Disabled") return await this.browserObserver.enable();
    return ok(this.browserObserver.state());
  }

  public async captureBrowserEvent(event: NativeBrowserEvent): Promise<Result<void>> {
    return await this.browserObserver.captureAndPublish(event);
  }

  public issueToken(scopes: Parameters<LocalApiTokenIssuer["issue"]>[0]): string {
    return this.tokenIssuer.issue(scopes);
  }

  public restUrl(): string {
    return this.rest.url();
  }

  public websocketUrl(): string {
    return this.websocket.url();
  }

  private restOptions(options: RuntimeApplicationOptions): PublicApiServerOptions {
    return {
      tokenIssuer: this.tokenIssuer,
      ...(options.host === undefined ? {} : { host: options.host }),
      ...(options.restPort === undefined ? {} : { port: options.restPort }),
      handlers: {
        submitTask: async (input) => {
          const result = this.optionsPersistence
            ? await this.coordinator.submitDurable({ goal: input.goal })
            : this.coordinator.submit({ goal: input.goal });
          if (!result.ok) throw new Error(result.error.message);
          if (this.scheduler) {
            this.scheduler.enqueue(result.value.task_id, input.priority);
            void this.scheduler.dispatch();
          }
          return result.value;
        },
        getTask: async (taskId) => {
          const result = this.tasks.get(taskId);
          return result.ok ? result.value : undefined;
        },
        listTasks: async () => this.tasks.list(),
        listPermissions: async () => this.permissions.list(),
        updatePermission: async (grantId, patch) => {
          const result = this.permissions.update(grantId, patch.granted);
          return result.ok ? result.value : undefined;
        },
        getConfig: async () => this.configuration.snapshot(),
        updateConfig: async (input) => {
          const result = this.configuration.update(input.section, input.value as never);
          if (!result.ok) throw new Error(result.error.message);
          return this.configuration.snapshot();
        },
        registerWebhook: async (input) => this.webhook.register(input),
      },
    };
  }
}
