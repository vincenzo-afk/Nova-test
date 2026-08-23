import { randomUUID } from "node:crypto";
import {
  createMessage,
  err,
  ok,
  type CommunicationBus,
  type ErrorInfo,
  type MessageEnvelope,
  type Result,
  type StructuredLogger,
} from "@nova/shared";

export type BrowserEventType = "tab_opened" | "tab_closed" | "tab_updated" | "tab_activated";
export type BrowserObserverState = "Disabled" | "Enabling" | "Active" | "Degraded" | "Failed";

export interface NativeBrowserEvent {
  readonly type: BrowserEventType;
  readonly browser: string;
  readonly tab_id: number;
  readonly window_id: number;
  readonly url?: string;
  readonly title?: string;
  readonly active: boolean;
  readonly correlation_id?: string;
}

export interface NativeBrowserEventBridgeContract {
  start(handler: (event: NativeBrowserEvent) => Promise<void>): Promise<void>;
  stop(): Promise<void>;
}

export interface BrowserObserverOptions {
  readonly permissions: {
    list(): readonly { readonly source: string; readonly granted: boolean }[];
  };
  readonly bridge: NativeBrowserEventBridgeContract;
  readonly bus: CommunicationBus;
  readonly excludedDomains: readonly string[];
  readonly now?: () => string;
  readonly maxTitleLength?: number;
  readonly logger?: StructuredLogger;
}

const BROWSER_PERMISSION = "browser_metadata";
const DEFAULT_MAX_TITLE_LENGTH = 512;
const supportedEventTypes = new Set<BrowserEventType>([
  "tab_opened",
  "tab_closed",
  "tab_updated",
  "tab_activated",
]);

export class BrowserObserver {
  private currentState: BrowserObserverState = "Disabled";
  private readonly now: () => string;
  private readonly maxTitleLength: number;
  private readonly logger: StructuredLogger | undefined;
  private excludedDomains: readonly string[];
  private readonly pending = new Map<string, MessageEnvelope>();

  public constructor(private readonly options: BrowserObserverOptions) {
    this.now = options.now ?? (() => new Date().toISOString());
    this.maxTitleLength = options.maxTitleLength ?? DEFAULT_MAX_TITLE_LENGTH;
    this.logger = options.logger;
    this.excludedDomains = options.excludedDomains
      .map(normalizeDomainRule)
      .filter((domain): domain is string => domain !== null);
  }

  public state(): BrowserObserverState {
    return this.currentState;
  }

  public setExcludedDomains(domains: readonly string[]): void {
    this.excludedDomains = domains
      .map(normalizeDomainRule)
      .filter((domain): domain is string => domain !== null);
    let purgedPendingCount = 0;
    for (const [key, message] of this.pending) {
      const payload = message.payload as Record<string, unknown>;
      const url = payload.url;
      if (typeof url === "string" && this.isExcludedDomain(url)) {
        this.pending.delete(key);
        purgedPendingCount += 1;
      }
    }
    this.logger?.info("browser.policy.updated", {
      excluded_domain_count: this.excludedDomains.length,
      purged_pending_count: purgedPendingCount,
    });
  }

  public async enable(): Promise<Result<BrowserObserverState>> {
    if (!this.hasPermission()) {
      this.logger?.warning("browser.observer.enable_rejected", {
        error_code: "NOVA-SEC001",
        reason: "permission_missing",
      });
      return err(this.permissionError());
    }
    if (this.currentState !== "Disabled") {
      return err(this.transitionError(this.currentState, "Enabling"));
    }
    this.currentState = "Enabling";
    try {
      await this.options.bridge.start(async (event) => {
        await this.captureAndPublish(event);
      });
      this.currentState = "Active";
      this.logger?.info("browser.observer.enabled", { permission: BROWSER_PERMISSION });
      return ok(this.currentState);
    } catch (cause) {
      this.currentState = "Failed";
      this.logger?.error("browser.observer.enable_failed", {
        error_code: "NOVA-EVT001",
      });
      return err(
        this.observerError(
          cause instanceof Error ? cause.message : "Browser extension bridge failed.",
        ),
      );
    }
  }

  public async capture(event: NativeBrowserEvent): Promise<Result<void>> {
    const permission = await this.ensureActiveAndPermitted();
    if (!permission.ok) {
      this.logger?.warning(
        "browser.event.rejected",
        { error_code: permission.error.code, reason: "observer_not_permitted" },
        event.correlation_id,
      );
      return permission;
    }
    if (!validEvent(event)) {
      this.logger?.warning(
        "browser.event.rejected",
        { error_code: "NOVA-TL002", reason: "invalid_metadata_shape" },
        event.correlation_id,
      );
      return err(this.invalidEvent());
    }

    let normalizedUrl: string | undefined;
    if (event.url !== undefined) {
      const candidateUrl = normalizeUrl(event.url);
      if (candidateUrl === null) {
        this.logger?.warning(
          "browser.event.rejected",
          { error_code: "NOVA-TL002", reason: "unsupported_url" },
          event.correlation_id,
        );
        return err(this.invalidEvent());
      }
      if (this.isExcludedDomain(candidateUrl)) {
        this.logger?.info(
          "browser.event.excluded",
          {
            event_type: event.type,
            domain: new URL(candidateUrl).hostname,
            reason: "domain_policy",
          },
          event.correlation_id,
        );
        return ok(undefined);
      }
      normalizedUrl = candidateUrl;
    }

    const payload: Record<string, string | number | boolean> = {
      browser: bounded(event.browser, 64),
      tab_id: event.tab_id,
      window_id: event.window_id,
      title: bounded(event.title ?? "", this.maxTitleLength),
      active: event.active,
      event_type: event.type,
    };
    if (normalizedUrl !== undefined) payload.url = normalizedUrl;

    const topic =
      event.type === "tab_opened"
        ? "observer.browser.tab_opened"
        : event.type === "tab_closed"
          ? "observer.browser.tab_closed"
          : "observer.browser.navigation";
    const message = {
      ...createMessage({
        topic,
        schema_version: "1.0.0",
        correlation_id: event.correlation_id ?? randomUUID(),
        source_service: "observer.browser",
        payload,
      }),
      timestamp: this.now(),
    };
    this.pending.set(`${event.window_id}:${event.tab_id}`, message);
    this.logger?.debug(
      "browser.event.queued",
      {
        event_type: event.type,
        tab_id: event.tab_id,
        window_id: event.window_id,
        has_url: normalizedUrl !== undefined,
        title_length: (event.title ?? "").length,
      },
      event.correlation_id,
    );
    return ok(undefined);
  }

  public async captureAndPublish(event: NativeBrowserEvent): Promise<Result<void>> {
    const captured = await this.capture(event);
    if (!captured.ok) return captured;
    return await this.flush();
  }

  public async flush(): Promise<Result<void>> {
    if (this.currentState !== "Active") {
      this.pending.clear();
      return ok(undefined);
    }
    const messages = [...this.pending.values()];
    this.pending.clear();
    for (const message of messages) {
      const published = await this.options.bus.publish(message);
      if (!published.ok) {
        this.logger?.error(
          "browser.event.publish_failed",
          { error_code: published.error.code },
          message.correlation_id,
        );
        return published;
      }
    }
    if (messages.length > 0) {
      this.logger?.info("browser.event.published", { event_count: messages.length });
    }
    return ok(undefined);
  }

  public async revoke(): Promise<Result<BrowserObserverState>> {
    if (this.currentState === "Disabled") {
      return err(this.transitionError(this.currentState, "Disabled"));
    }
    await this.options.bridge.stop();
    const purgedPendingCount = this.pending.size;
    this.pending.clear();
    this.currentState = "Disabled";
    this.logger?.info("browser.observer.revoked", { purged_pending_count: purgedPendingCount });
    return ok(this.currentState);
  }

  private async ensureActiveAndPermitted(): Promise<Result<void>> {
    if (!this.hasPermission()) {
      if (this.currentState !== "Disabled") {
        await this.options.bridge.stop();
        const purgedPendingCount = this.pending.size;
        this.pending.clear();
        this.currentState = "Disabled";
        this.logger?.warning("browser.observer.revoked", {
          purged_pending_count: purgedPendingCount,
          reason: "permission_revoked",
        });
      }
      return err(this.permissionError());
    }
    if (this.currentState !== "Active") {
      return err({
        code: "NOVA-SEC001",
        message: "Browser observation is not active.",
        retryable: false,
      });
    }
    return ok(undefined);
  }

  private hasPermission(): boolean {
    return this.options.permissions
      .list()
      .some((permission) => permission.source === BROWSER_PERMISSION && permission.granted);
  }

  private isExcludedDomain(url: string): boolean {
    const hostname = new URL(url).hostname.toLowerCase();
    return this.excludedDomains.some((rule) => {
      if (rule.startsWith("*.")) {
        const suffix = rule.slice(2);
        return hostname === suffix || hostname.endsWith(`.${suffix}`);
      }
      return hostname === rule;
    });
  }

  private permissionError(): ErrorInfo {
    return {
      code: "NOVA-SEC001",
      message: "Browser metadata permission is required.",
      retryable: false,
    };
  }

  private invalidEvent(): ErrorInfo {
    return {
      code: "NOVA-TL002",
      message: "Native browser metadata event is malformed or contains an unsupported URL.",
      retryable: false,
    };
  }

  private observerError(message: string): ErrorInfo {
    return { code: "NOVA-EVT001", message, retryable: true };
  }

  private transitionError(from: BrowserObserverState, to: BrowserObserverState): ErrorInfo {
    return {
      code: "NOVA-EVT001",
      message: `Illegal observer transition: ${from} -> ${to}.`,
      retryable: false,
      details: { from, to },
    };
  }
}

function validEvent(event: NativeBrowserEvent): boolean {
  return (
    supportedEventTypes.has(event.type) &&
    typeof event.browser === "string" &&
    event.browser.length > 0 &&
    Number.isInteger(event.tab_id) &&
    event.tab_id >= 0 &&
    Number.isInteger(event.window_id) &&
    event.window_id >= 0 &&
    (event.url === undefined || typeof event.url === "string") &&
    (event.title === undefined || typeof event.title === "string") &&
    typeof event.active === "boolean"
  );
}

function normalizeUrl(value: string): string | null {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    parsed.username = "";
    parsed.password = "";
    parsed.search = "";
    parsed.hash = "";
    return `${parsed.origin}${parsed.pathname === "/" ? "" : parsed.pathname}`;
  } catch {
    return null;
  }
}

function normalizeDomainRule(value: string): string | null {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized.startsWith("*.")) {
    return normalized.length > 2 ? normalized : null;
  }
  return normalized;
}

function bounded(value: string, maxLength: number): string {
  return Array.from(value, (character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127 ? " " : character;
  })
    .join("")
    .trim()
    .slice(0, maxLength);
}

export class NativeBrowserEventBridge implements NativeBrowserEventBridgeContract {
  private handler: ((event: NativeBrowserEvent) => Promise<void>) | undefined;

  public async start(handler: (event: NativeBrowserEvent) => Promise<void>): Promise<void> {
    if (this.handler) throw new Error("Browser extension bridge is already running.");
    this.handler = handler;
  }

  public async stop(): Promise<void> {
    this.handler = undefined;
  }

  public async receive(event: NativeBrowserEvent): Promise<Result<void>> {
    if (!this.handler) {
      return err({
        code: "NOVA-EVT001",
        message: "Browser extension bridge is not active.",
        retryable: true,
      });
    }
    await this.handler(event);
    return ok(undefined);
  }

  public static extensionProtocolDescription(): string {
    return "Chrome Manifest V3 Native Messaging using tabs.onUpdated and tabs.onActivated metadata events; no page content APIs.";
  }
}
