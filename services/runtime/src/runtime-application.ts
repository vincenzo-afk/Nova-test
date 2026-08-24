import type {
  ObservationIndexRequest,
  ObservationIndexResult,
  ObservationIndexer,
  MemoryRecordSummary,
  MemorySearchInput,
  MemoryStore,
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
  KeyboardObserver,
  NativeKeyboardEventBridge,
  type KeyboardHotkeyRegistration,
  type NativeKeyboardEventBridgeContract,
  type KeyboardObserverState,
  MouseObserver,
  NativeMouseEventBridge,
  type NativeMouseEventBridgeContract,
  type MouseObserverState,
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
import {
  LocalApiTokenIssuer,
  PublicApiServer,
  type GraphQueryInput as PublicGraphQueryInput,
  type PublicApiServerOptions,
} from "./rest-api.js";
import { ConfigurationStore, type NovaConfiguration } from "./configuration-store.js";
import { KnowledgeGraph, type GraphEdgeType, type GraphQueryResult } from "./knowledge-graph.js";
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
import type { DevicePairingManager, TrustedDevice } from "./device-pairing.js";
import type { DeviceSnapshot, SessionContinuityManager } from "./session-continuity.js";
import {
  DistributedTaskCoordinator,
  type DistributedPlacementInput,
  type DistributedPlacementResult,
} from "./distributed-task-coordinator.js";
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
  readonly keyboardObserverBridge?: NativeKeyboardEventBridgeContract;
  readonly keyboardHotkeys?: readonly KeyboardHotkeyRegistration[];
  readonly mouseObserverBridge?: NativeMouseEventBridgeContract;
  readonly mouseIdleThresholdMs?: number;
  readonly observationIndexer?: ObservationIndexer;
  readonly memoryStore?: MemoryStore;
  readonly knowledgeGraph?: KnowledgeGraph;
  readonly distributedTaskCoordinator?: DistributedTaskCoordinator;
  readonly devicePairingManager?: DevicePairingManager;
  readonly sessionContinuityManager?: SessionContinuityManager;
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
  public readonly keyboardObserver: KeyboardObserver;
  public readonly mouseObserver: MouseObserver;
  public readonly worldModel: WorldModel;
  public readonly observationIndexer: ObservationIndexer | undefined;
  public readonly knowledgeGraph: KnowledgeGraph;
  public readonly distributedTaskCoordinator: DistributedTaskCoordinator;
  public readonly devicePairingManager: DevicePairingManager | undefined;
  public readonly sessionContinuityManager: SessionContinuityManager | undefined;
  public readonly toolRegistry: ToolRegistry;
  private readonly executor: Executor;
  private readonly verifier: Verifier;
  private readonly optionsPersistence: RuntimeApplicationOptions["persistence"];
  private readonly dispose: RuntimeApplicationOptions["dispose"];
  private readonly logger: StructuredLogger | undefined;
  private readonly memoryStore: MemoryStore | undefined;

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
    this.memoryStore = options.memoryStore;
    this.knowledgeGraph = options.knowledgeGraph ?? new KnowledgeGraph();
    this.tokenIssuer = new LocalApiTokenIssuer();
    this.tasks = options.taskManager ?? new TaskManager();
    this.distributedTaskCoordinator =
      options.distributedTaskCoordinator ?? new DistributedTaskCoordinator(this.tasks);
    this.devicePairingManager = options.devicePairingManager;
    this.sessionContinuityManager = options.sessionContinuityManager;
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
    this.configuration = new ConfigurationStore({
      initial: initialConfiguration,
      ...(this.logger === undefined ? {} : { logger: this.logger }),
    });
    this.events = new CommunicationBusEventJournal(bus);
    this.worldModel = new WorldModel(this.logger === undefined ? {} : { logger: this.logger });
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
      ...(this.logger === undefined ? {} : { logger: this.logger }),
    });
    this.keyboardObserver = new KeyboardObserver({
      permissions: this.permissions,
      bridge: options.keyboardObserverBridge ?? new NativeKeyboardEventBridge(),
      bus,
      hotkeys: options.keyboardHotkeys ?? [],
      ...(this.logger === undefined ? {} : { logger: this.logger }),
    });
    this.mouseObserver = new MouseObserver({
      permissions: this.permissions,
      bridge: options.mouseObserverBridge ?? new NativeMouseEventBridge(),
      bus,
      ...(options.mouseIdleThresholdMs === undefined
        ? {}
        : { idleThresholdMs: options.mouseIdleThresholdMs }),
      ...(this.logger === undefined ? {} : { logger: this.logger }),
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
      if (this.keyboardObserver.state() !== "Disabled") await this.keyboardObserver.revoke();
      if (this.mouseObserver.state() !== "Disabled") await this.mouseObserver.revoke();
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
    const keyboard = await this.syncKeyboardObserver();
    if (!keyboard.ok) return err(keyboard.error);
    const browser = await this.syncBrowserObserver();
    if (!browser.ok) return err(browser.error);
    const mouse = await this.syncMouseObserver();
    if (!mouse.ok) return err(mouse.error);
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

  public async syncKeyboardObserver(): Promise<Result<KeyboardObserverState>> {
    const activityGranted = this.permissions
      .list()
      .some((grant) => grant.source === "keyboard_activity" && grant.granted);
    if (!activityGranted) {
      if (this.keyboardObserver.state() !== "Disabled") return await this.keyboardObserver.revoke();
      return ok("Disabled");
    }
    if (this.keyboardObserver.state() === "Disabled") return await this.keyboardObserver.enable();
    return ok(this.keyboardObserver.state());
  }

  public async syncMouseObserver(): Promise<Result<MouseObserverState>> {
    const activityGranted = this.permissions
      .list()
      .some((grant) => grant.source === "mouse_activity" && grant.granted);
    if (!activityGranted) {
      if (this.mouseObserver.state() !== "Disabled") return await this.mouseObserver.revoke();
      return ok("Disabled");
    }
    if (this.mouseObserver.state() === "Disabled") return await this.mouseObserver.enable();
    return ok(this.mouseObserver.state());
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

  public placeTask(input: DistributedPlacementInput): Result<DistributedPlacementResult> {
    return this.distributedTaskCoordinator.place(input);
  }

  public listTrustedDevices(): readonly TrustedDevice[] {
    return this.devicePairingManager?.listTrusted() ?? [];
  }

  public listDeviceSnapshots(): readonly DeviceSnapshot[] {
    return this.sessionContinuityManager?.listDevices() ?? [];
  }

  public revokeTrustedDevice(deviceId: string): Result<void> {
    if (!this.devicePairingManager) {
      return err({
        code: "NOVA-SEC001",
        message: "Device pairing is not configured for this runtime.",
        retryable: true,
      });
    }
    return this.devicePairingManager.unpair(deviceId);
  }

  public negotiateDeviceCapability(
    deviceId: string,
    capabilityId: string,
  ): ReturnType<SessionContinuityManager["negotiate"]> {
    if (!this.sessionContinuityManager) {
      return err({
        code: "NOVA-SEC001",
        message: "Device capability negotiation is not configured for this runtime.",
        retryable: true,
      });
    }
    return this.sessionContinuityManager.negotiate(deviceId, capabilityId);
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

  public async searchMemory(
    input: MemorySearchInput,
  ): Promise<Result<readonly MemoryRecordSummary[]>> {
    if (!this.memoryStore) {
      return err({
        code: "NOVA-MEM001",
        message: "Nova memory store is not ready.",
        retryable: true,
      });
    }
    return await this.memoryStore.search(input);
  }

  public async getMemoryRecord(input: string): Promise<Result<MemoryRecordSummary>> {
    if (!this.memoryStore) {
      return err({
        code: "NOVA-MEM001",
        message: "Nova memory store is not ready.",
        retryable: true,
      });
    }
    return await this.memoryStore.readRecord(input);
  }

  public queryGraph(input: PublicGraphQueryInput): Result<GraphQueryResult> {
    return this.knowledgeGraph.query({
      node_id: input.node_id,
      direction: input.direction,
      depth: input.depth,
      ...(input.edge_type === undefined ? {} : { edge_type: input.edge_type as GraphEdgeType }),
    });
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
        search: async (input) => {
          const result = await this.searchMemory(input);
          if (!result.ok) throw new Error(result.error.message);
          return { results: result.value, query: input.query };
        },
        getMemoryRecord: async (recordId) => {
          const result = await this.getMemoryRecord(recordId);
          if (!result.ok) {
            if (result.error.code === "NOVA-MEM003") return undefined;
            throw new Error(result.error.message);
          }
          return result.value;
        },
        queryGraph: async (input) => {
          const result = this.queryGraph(input);
          if (!result.ok) {
            if (result.error.code === "NOVA-MEM003") return undefined;
            throw new Error(result.error.message);
          }
          return result.value;
        },
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
