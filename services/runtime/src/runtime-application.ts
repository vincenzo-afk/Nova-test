import type {
  ObservationIndexRequest,
  ObservationIndexResult,
  ObservationIndexer,
} from "@nova/memory";
import { InMemoryCommunicationBus, err, ok, type Result } from "@nova/shared";
import {
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
  readonly observationIndexer?: ObservationIndexer;
  readonly registeredTools?: readonly RegisteredTool[];
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
  public readonly worldModel: WorldModel;
  public readonly observationIndexer: ObservationIndexer | undefined;
  public readonly toolRegistry: ToolRegistry;
  private readonly executor: Executor;
  private readonly verifier: Verifier;
  private readonly optionsPersistence: RuntimeApplicationOptions["persistence"];
  private readonly dispose: RuntimeApplicationOptions["dispose"];

  public constructor(options: RuntimeApplicationOptions) {
    const bus = new InMemoryCommunicationBus();
    this.optionsPersistence = options.persistence;
    this.dispose = options.dispose;
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
    this.configuration = new ConfigurationStore({ initial: options.configuration });
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
    if (this.optionsPersistence) {
      const recovered = await this.optionsPersistence.recoverAfterCrash();
      if (!recovered.ok) throw new Error(recovered.error.message);
      this.tasks.restore(recovered.value);
    }
    const observers = await this.syncObservers();
    if (!observers.ok) throw new Error(observers.error.message);
    await this.rest.start();
    try {
      await this.websocket.start();
    } catch (cause) {
      await this.rest.stop();
      throw cause;
    }
  }

  public async stop(): Promise<void> {
    try {
      if (this.windowsObserver.state() !== "Disabled") await this.windowsObserver.revoke();
      if (this.clipboardObserver.state() !== "Disabled") await this.clipboardObserver.revoke();
      if (this.notificationObserver.state() !== "Disabled")
        await this.notificationObserver.revoke();
      this.worldModel.detach();
      await this.websocket.stop();
      await this.rest.stop();
    } finally {
      await this.dispose?.();
    }
  }

  public async executeToolStep(
    input: ExecutionStep,
  ): Promise<
    Result<{ readonly execution: ExecutionResult; readonly verification: VerificationVerdict }>
  > {
    const execution = await this.executor.execute(input);
    if (!execution.ok) return execution;
    const verification = this.verifier.verify(input, execution.value);
    if (!verification.ok) return verification;
    return ok({ execution: execution.value, verification: verification.value });
  }

  public async adoptObservation(
    request: ObservationIndexRequest,
  ): Promise<Result<ObservationIndexResult>> {
    if (!this.observationIndexer) {
      return err({
        code: "NOVA-MEM001",
        message: "Observation indexing is not configured for this runtime.",
        retryable: true,
      });
    }
    return await this.observationIndexer.index(request);
  }

  public async syncObservers(): Promise<Result<WindowsObserverState>> {
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
