import { spawn, type ChildProcessByStdio } from "node:child_process";
import type { Readable } from "node:stream";
import { createInterface, type Interface } from "node:readline";
import {
  createMessage,
  err,
  ok,
  type CommunicationBus,
  type ErrorInfo,
  type MessageEnvelope,
  type Result,
} from "@nova/shared";

export type NotificationObserverState = "Disabled" | "Enabling" | "Active" | "Degraded" | "Failed";

export interface NativeNotificationEvent {
  readonly type: "received";
  readonly source_application: string;
  readonly title: string;
  readonly body?: string;
  readonly sensitive_source: boolean;
  readonly correlation_id?: string;
}

export interface NativeNotificationEventBridgeContract {
  start(handler: (event: NativeNotificationEvent) => Promise<void>): Promise<void>;
  stop(): Promise<void>;
}

export interface NotificationObserverOptions {
  readonly permissions: {
    list(): readonly { readonly source: string; readonly granted: boolean }[];
  };
  readonly bridge: NativeNotificationEventBridgeContract;
  readonly bus: CommunicationBus;
  readonly now?: () => string;
  readonly maxBodyBytes?: number;
}

const METADATA_PERMISSION = "notifications_metadata";
const CONTENT_PERMISSION = "notifications_content";
const MAX_BODY_BYTES = 1_048_576;

export class NotificationObserver {
  private currentState: NotificationObserverState = "Disabled";
  private readonly now: () => string;
  private readonly maxBodyBytes: number;
  private readonly pending = new Map<string, MessageEnvelope>();

  public constructor(private readonly options: NotificationObserverOptions) {
    this.now = options.now ?? (() => new Date().toISOString());
    this.maxBodyBytes = options.maxBodyBytes ?? MAX_BODY_BYTES;
  }

  public state(): NotificationObserverState {
    return this.currentState;
  }

  public async enable(): Promise<Result<NotificationObserverState>> {
    if (!this.hasPermission(METADATA_PERMISSION)) {
      return err(this.permissionError("Notification metadata permission is required."));
    }
    if (this.currentState !== "Disabled") {
      return err(this.transitionError(this.currentState, "Enabling"));
    }
    this.currentState = "Enabling";
    try {
      await this.options.bridge.start(async (event) => {
        await this.capture(event);
      });
      this.currentState = "Active";
      return ok(this.currentState);
    } catch (cause) {
      this.currentState = "Failed";
      return err(
        this.observerError(cause instanceof Error ? cause.message : "Native bridge failed."),
      );
    }
  }

  public async capture(event: NativeNotificationEvent): Promise<Result<void>> {
    const permission = await this.ensureActiveAndPermitted();
    if (!permission.ok) return permission;
    if (!this.validEvent(event)) {
      return err(this.invalidEvent("Native notification event is malformed."));
    }

    const bodyBytes = event.body === undefined ? 0 : Buffer.byteLength(event.body, "utf8");
    const contentPermission = this.hasPermission(CONTENT_PERMISSION);
    const contentAllowed =
      contentPermission &&
      !event.sensitive_source &&
      event.body !== undefined &&
      bodyBytes <= this.maxBodyBytes;
    const payload: Record<string, string | number> = {
      entity_ref: "notification",
      source_application: bound(event.source_application, 160),
      title: bound(event.title, 512),
      capture_level: contentAllowed ? "content" : "metadata",
      body_bytes: bodyBytes,
    };

    if (contentAllowed && event.body !== undefined) {
      payload.body = event.body;
    } else if (event.sensitive_source) {
      payload.excluded_reason = "sensitive_source";
    } else if (!contentPermission) {
      payload.excluded_reason = "content_permission_missing";
    } else if (bodyBytes > this.maxBodyBytes) {
      payload.excluded_reason = "body_too_large";
    }

    const message = {
      ...createMessage({
        topic: "observer.notification.received",
        schema_version: "1.0.0",
        correlation_id: event.correlation_id ?? randomUUID(),
        source_service: "observer.notifications",
        payload,
      }),
      timestamp: this.now(),
    };
    this.pending.set(`${event.source_application}\u0000${event.title}\u0000${bodyBytes}`, message);
    return ok(undefined);
  }

  public async flush(): Promise<Result<void>> {
    if (this.currentState !== "Active") {
      this.pending.clear();
      return ok(undefined);
    }
    const messages = [...this.pending.values()];
    this.pending.clear();
    for (const message of messages) {
      const result = await this.options.bus.publish(message);
      if (!result.ok) return result;
    }
    return ok(undefined);
  }

  public async revoke(): Promise<Result<NotificationObserverState>> {
    if (this.currentState === "Disabled") {
      return err(this.transitionError(this.currentState, "Disabled"));
    }
    await this.options.bridge.stop();
    this.pending.clear();
    this.currentState = "Disabled";
    return ok(this.currentState);
  }

  private async ensureActiveAndPermitted(): Promise<Result<void>> {
    if (!this.hasPermission(METADATA_PERMISSION)) {
      if (this.currentState !== "Disabled") {
        await this.options.bridge.stop();
        this.pending.clear();
        this.currentState = "Disabled";
      }
      return err(this.permissionError("Notification metadata permission is required."));
    }
    if (this.currentState !== "Active") {
      return err(this.permissionError("Notification observation is not active."));
    }
    return ok(undefined);
  }

  private hasPermission(source: string): boolean {
    return this.options.permissions
      .list()
      .some((permission) => permission.source === source && permission.granted);
  }

  private validEvent(event: NativeNotificationEvent): boolean {
    return (
      event.type === "received" &&
      typeof event.source_application === "string" &&
      event.source_application.length > 0 &&
      typeof event.title === "string" &&
      event.title.length > 0 &&
      (event.body === undefined || typeof event.body === "string") &&
      typeof event.sensitive_source === "boolean"
    );
  }

  private permissionError(message: string): ErrorInfo {
    return { code: "NOVA-SEC001", message, retryable: false };
  }

  private invalidEvent(message: string): ErrorInfo {
    return { code: "NOVA-TL002", message, retryable: false };
  }

  private observerError(message: string): ErrorInfo {
    return { code: "NOVA-EVT001", message, retryable: true };
  }

  private transitionError(
    from: NotificationObserverState,
    to: NotificationObserverState,
  ): ErrorInfo {
    return {
      code: "NOVA-EVT001",
      message: `Illegal observer transition: ${from} -> ${to}.`,
      retryable: false,
      details: { from, to },
    };
  }
}

function bound(value: string, maxLength: number): string {
  return value.slice(0, maxLength);
}

function randomUUID(): string {
  return crypto.randomUUID();
}

export class NativeNotificationEventBridge implements NativeNotificationEventBridgeContract {
  private child: ChildProcessByStdio<null, Readable, Readable> | undefined;
  private lines: Interface | undefined;

  public constructor(private readonly powershellPath = "powershell.exe") {}

  public async start(handler: (event: NativeNotificationEvent) => Promise<void>): Promise<void> {
    if (process.platform !== "win32") {
      throw new Error("Native notification observation requires Windows.");
    }
    if (this.child) throw new Error("Native notification event bridge is already running.");
    const child = spawn(
      this.powershellPath,
      [
        "-NoLogo",
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        NativeNotificationEventBridge.nativePowerShellScript(),
      ],
      { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] },
    );
    this.child = child;
    const lines = createInterface({ input: child.stdout });
    this.lines = lines;
    lines.on("line", (line) => {
      try {
        const parsed = JSON.parse(line) as NativeNotificationEvent;
        if (parsed.type === "received") void handler(parsed);
      } catch {
        // Native diagnostics are intentionally not promoted into observer events.
      }
    });
    await new Promise<void>((resolve, reject) => {
      const onSpawn = () => {
        child.off("error", onError);
        resolve();
      };
      const onError = (error: Error) => {
        child.off("spawn", onSpawn);
        reject(error);
      };
      child.once("spawn", onSpawn);
      child.once("error", onError);
    });
  }

  public async stop(): Promise<void> {
    const child = this.child;
    if (!child) return;
    this.child = undefined;
    this.lines?.close();
    this.lines = undefined;
    child.kill();
  }

  public static nativePowerShellScript(): string {
    return String.raw`
$ErrorActionPreference = 'Stop'
Add-Type -ReferencedAssemblies UIAutomationClient.dll,UIAutomationTypes.dll -TypeDefinition @'
using System;
using System.Diagnostics;
using System.Windows.Automation;

public static class NovaNotificationHost {
  private const int NotificationEventId = 20017; // UIA NotificationEvent
  public static AutomationEventHandler Handler;
  private static string Escape(string value) => (value ?? "").Replace("\\", "\\\\").Replace("\"", "\\\"").Replace("\r", "").Replace("\n", " ");
  private static string SourceApplication(AutomationElement element, out bool sensitive) {
    sensitive = false;
    try {
      var name = Process.GetProcessById(element.Current.ProcessId).ProcessName;
      var lower = name.ToLowerInvariant();
      sensitive = lower.Contains("signal") || lower.Contains("whatsapp") || lower.Contains("telegram") || lower.Contains("discord") || lower.Contains("authenticator") || lower.Contains("password") || lower.Contains("credential") || lower.Contains("2fa");
      return name;
    } catch { return "unknown"; }
  }
  public static void Emit(AutomationElement element, AutomationEventArgs args) {
    try {
      var notificationArgs = args as NotificationEventArgs;
      var body = notificationArgs == null ? "" : notificationArgs.DisplayString;
      bool sensitive; var source = SourceApplication(element, out sensitive);
      var title = element.Current.Name;
      Console.WriteLine("{\"type\":\"received\",\"source_application\":\"" + Escape(source) + "\",\"title\":\"" + Escape(title) + "\",\"body\":\"" + Escape(body) + "\",\"sensitive_source\":" + (sensitive ? "true" : "false") + "}");
      Console.Out.Flush();
    } catch { }
  }
  public static void Start() {
    Handler = (sender, args) => { var element = sender as AutomationElement; if (element != null && args.EventId.Id == NotificationEventId) Emit(element, args); };
    Automation.AddAutomationEventHandler(AutomationElement.NotificationEvent, AutomationElement.RootElement, TreeScope.Subtree, Handler);
  }
  public static void Stop() {
    try { if (Handler != null) Automation.RemoveAutomationEventHandler(AutomationElement.NotificationEvent, AutomationElement.RootElement, Handler); } catch { }
  }
}
'@
[NovaNotificationHost]::Start()
try { [System.Threading.Thread]::Sleep([System.Threading.Timeout]::Infinite) } finally { [NovaNotificationHost]::Stop() }
`;
  }
}
