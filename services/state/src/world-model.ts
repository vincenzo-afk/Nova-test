import type { CommunicationBus, MessageEnvelope, StructuredLogger } from "@nova/shared";

export interface WorldModelApplication {
  readonly application_name: string;
  readonly process_id: number;
}

export interface WorldModelWindow {
  readonly window_id: string;
  readonly process_id: number;
  readonly application_name: string;
  readonly title: string;
  readonly monitor_id: string;
  readonly virtual_desktop_id: string;
  readonly z_order: number;
}

export interface WorldModelFocusState {
  readonly active_application: WorldModelApplication | null;
  readonly focused_window: WorldModelWindow | null;
  readonly updated_at: string;
  readonly confidence: number;
  readonly correlation_id: string;
}

export interface WorldModelEngagementState {
  readonly keyboard_state?: "active" | "idle";
  readonly mouse_state?: "active" | "idle";
  readonly idle_ms: number;
  readonly updated_at: string;
  readonly confidence: number;
  readonly correlation_id: string;
}

export interface WorldModelTransition {
  readonly topic: string;
  readonly observed_at: string;
  readonly correlation_id: string;
}

export interface WorldModelOptions {
  readonly now?: () => string;
  readonly maxTransitions?: number;
  readonly logger?: StructuredLogger;
}

const topics = [
  "observer.application.launched",
  "observer.application.closed",
  "observer.window.opened",
  "observer.window.closed",
  "observer.window.focused",
  "observer.window.title_changed",
  "observer.keyboard.activity",
  "observer.keyboard.hotkey_triggered",
  "observer.mouse.activity",
] as const;

type ApplicationPayload = WorldModelApplication;
type WindowPayload = WorldModelWindow;

export class WorldModel {
  private readonly applications = new Map<number, WorldModelApplication>();
  private readonly transitions: WorldModelTransition[] = [];
  private readonly now: () => string;
  private readonly maxTransitions: number;
  private readonly logger: StructuredLogger | undefined;
  private focusState: WorldModelFocusState | null = null;
  private engagementState: WorldModelEngagementState | null = null;
  private unsubscribe: (() => void) | undefined;

  public constructor(options: WorldModelOptions = {}) {
    this.now = options.now ?? (() => new Date().toISOString());
    this.maxTransitions = Math.max(1, Math.floor(options.maxTransitions ?? 100));
    this.logger = options.logger;
  }

  public attach(bus: CommunicationBus): () => void {
    this.detach();
    const unsubscribers = topics.map((topic) =>
      bus.subscribe(topic, async (message) => {
        this.consume(message);
      }),
    );
    this.unsubscribe = () => {
      for (const unsubscribe of unsubscribers) unsubscribe();
    };
    return this.unsubscribe;
  }

  public detach(): void {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
  }

  public focus(): WorldModelFocusState | null {
    return this.focusState ? clone(this.focusState) : null;
  }

  public engagement(): WorldModelEngagementState | null {
    return this.engagementState ? clone(this.engagementState) : null;
  }

  public runningApplications(): readonly WorldModelApplication[] {
    return [...this.applications.values()].map((application) => clone(application));
  }

  public recentTransitions(): readonly WorldModelTransition[] {
    return this.transitions.map((transition) => clone(transition));
  }

  private consume(message: MessageEnvelope): void {
    this.transitions.push({
      topic: message.topic,
      observed_at: message.timestamp,
      correlation_id: message.correlation_id,
    });
    while (this.transitions.length > this.maxTransitions) this.transitions.shift();

    if (
      message.topic === "observer.keyboard.activity" ||
      message.topic === "observer.mouse.activity"
    ) {
      const engagement = parseEngagement(message.payload);
      if (engagement) {
        this.engagementState = {
          ...(this.engagementState ?? {}),
          ...(message.topic === "observer.keyboard.activity"
            ? { keyboard_state: engagement.state }
            : { mouse_state: engagement.state }),
          idle_ms: engagement.idle_ms,
          updated_at: message.timestamp || this.now(),
          confidence: 1,
          correlation_id: message.correlation_id,
        };
        this.logger?.info(
          "world_model.engagement.updated",
          {
            source: message.topic === "observer.keyboard.activity" ? "keyboard" : "mouse",
            state: engagement.state,
            idle_ms: engagement.idle_ms,
          },
          message.correlation_id,
        );
      }
      return;
    }

    if (message.topic === "observer.application.launched") {
      const application = parseApplication(message.payload);
      if (application) this.applications.set(application.process_id, application);
      return;
    }
    if (message.topic === "observer.application.closed") {
      const application = parseApplication(message.payload);
      if (!application) return;
      this.applications.delete(application.process_id);
      if (this.focusState?.active_application?.process_id === application.process_id) {
        this.setFocus(message, null, null);
      }
      return;
    }

    const window = parseWindow(message.payload);
    if (!window) return;
    this.applications.set(window.process_id, {
      application_name: window.application_name,
      process_id: window.process_id,
    });
    if (message.topic === "observer.window.closed") {
      if (this.focusState?.focused_window?.window_id === window.window_id) {
        this.setFocus(message, null, null);
      }
      return;
    }
    if (message.topic === "observer.window.focused") {
      this.setFocus(message, window, {
        application_name: window.application_name,
        process_id: window.process_id,
      });
      return;
    }
    if (
      message.topic === "observer.window.opened" ||
      message.topic === "observer.window.title_changed"
    ) {
      if (this.focusState?.focused_window?.window_id === window.window_id) {
        this.setFocus(message, window, this.focusState.active_application);
      }
    }
  }

  private setFocus(
    message: MessageEnvelope,
    window: WorldModelWindow | null,
    application: WorldModelApplication | null,
  ): void {
    this.focusState = {
      active_application: application ? clone(application) : null,
      focused_window: window ? clone(window) : null,
      updated_at: message.timestamp || this.now(),
      confidence: 1,
      correlation_id: message.correlation_id,
    };
  }
}

function parseEngagement(
  payload: unknown,
): { readonly state: "active" | "idle"; readonly idle_ms: number } | null {
  if (!isRecord(payload) || !hasExactKeys(payload, ["state", "idle_ms"])) return null;
  const idleMs = payload.idle_ms;
  if (
    (payload.state !== "active" && payload.state !== "idle") ||
    typeof idleMs !== "number" ||
    !Number.isInteger(idleMs) ||
    idleMs < 0 ||
    idleMs > 24 * 60 * 60 * 1_000
  ) {
    return null;
  }
  return { state: payload.state, idle_ms: idleMs };
}

function parseApplication(payload: unknown): ApplicationPayload | null {
  if (!isRecord(payload)) return null;
  const processId = payload.process_id;
  if (
    typeof payload.application_name !== "string" ||
    typeof processId !== "number" ||
    !Number.isInteger(processId) ||
    processId < 0
  ) {
    return null;
  }
  return {
    application_name: payload.application_name,
    process_id: processId,
  };
}

function parseWindow(payload: unknown): WindowPayload | null {
  if (!isRecord(payload)) return null;
  const processId = payload.process_id;
  const zOrder = payload.z_order;
  if (
    typeof payload.window_id !== "string" ||
    typeof payload.application_name !== "string" ||
    typeof payload.title !== "string" ||
    typeof payload.monitor_id !== "string" ||
    typeof payload.virtual_desktop_id !== "string" ||
    typeof processId !== "number" ||
    !Number.isInteger(processId) ||
    processId < 0 ||
    typeof zOrder !== "number" ||
    !Number.isInteger(zOrder)
  ) {
    return null;
  }
  return {
    window_id: payload.window_id,
    process_id: processId,
    application_name: payload.application_name,
    title: payload.title,
    monitor_id: payload.monitor_id,
    virtual_desktop_id: payload.virtual_desktop_id,
    z_order: zOrder,
  };
}

function hasExactKeys(value: object, keys: readonly string[]): boolean {
  const allowed = new Set(keys);
  return Object.keys(value).every((key) => allowed.has(key));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
