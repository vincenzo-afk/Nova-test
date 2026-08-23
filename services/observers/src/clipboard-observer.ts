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

export type ClipboardContentType = "text" | "image" | "file_reference" | "unknown";
export type ClipboardObserverState = "Disabled" | "Enabling" | "Active" | "Degraded" | "Failed";

export interface NativeClipboardEvent {
  readonly type: "changed";
  readonly content_type: ClipboardContentType;
  readonly content?: string;
  readonly source_application: string;
  readonly sensitive_source: boolean;
  readonly correlation_id?: string;
}

export interface NativeClipboardEventBridgeContract {
  start(handler: (event: NativeClipboardEvent) => Promise<void>): Promise<void>;
  stop(): Promise<void>;
}

export interface ClipboardObserverOptions {
  readonly permissions: {
    list(): readonly { readonly source: string; readonly granted: boolean }[];
  };
  readonly bridge: NativeClipboardEventBridgeContract;
  readonly bus: CommunicationBus;
  readonly now?: () => string;
  readonly maxContentBytes?: number;
}

const METADATA_PERMISSION = "clipboard_metadata";
const CONTENT_PERMISSION = "clipboard_content";
const MAX_CONTENT_BYTES = 1_048_576;

export class ClipboardObserver {
  private currentState: ClipboardObserverState = "Disabled";
  private readonly now: () => string;
  private readonly maxContentBytes: number;
  private readonly pending = new Map<string, MessageEnvelope>();

  public constructor(private readonly options: ClipboardObserverOptions) {
    this.now = options.now ?? (() => new Date().toISOString());
    this.maxContentBytes = options.maxContentBytes ?? MAX_CONTENT_BYTES;
  }

  public state(): ClipboardObserverState {
    return this.currentState;
  }

  public async enable(): Promise<Result<ClipboardObserverState>> {
    if (!this.hasPermission(METADATA_PERMISSION)) {
      return err(this.permissionError("Clipboard metadata permission is required."));
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

  public async capture(event: NativeClipboardEvent): Promise<Result<void>> {
    const permission = await this.ensureActiveAndPermitted();
    if (!permission.ok) return permission;
    if (!this.validEvent(event)) {
      return err(this.invalidEvent("Native clipboard event is malformed."));
    }

    const contentBytes = event.content === undefined ? 0 : Buffer.byteLength(event.content, "utf8");
    const contentPermission = this.hasPermission(CONTENT_PERMISSION);
    const contentAllowed =
      contentPermission &&
      !event.sensitive_source &&
      event.content_type === "text" &&
      event.content !== undefined &&
      contentBytes <= this.maxContentBytes;
    const payload: Record<string, string | number> = {
      entity_ref: "clipboard",
      content_type: event.content_type,
      source_application: bound(event.source_application, 160),
      capture_level: contentAllowed ? "content" : "metadata",
      content_bytes: contentBytes,
    };

    if (contentAllowed && event.content !== undefined) {
      payload.content = event.content;
    } else if (event.sensitive_source) {
      payload.excluded_reason = "sensitive_source";
    } else if (!contentPermission) {
      payload.excluded_reason = "content_permission_missing";
    } else if (event.content_type !== "text") {
      payload.excluded_reason = "unsupported_content_type";
    } else if (contentBytes > this.maxContentBytes) {
      payload.excluded_reason = "content_too_large";
    }

    const message = {
      ...createMessage({
        topic: "observer.clipboard.changed",
        schema_version: "1.0.0",
        correlation_id: event.correlation_id ?? randomUUID(),
        source_service: "observer.clipboard",
        payload,
      }),
      timestamp: this.now(),
    };
    this.pending.set("clipboard", message);
    return ok(undefined);
  }

  public async flush(): Promise<Result<void>> {
    if (this.currentState !== "Active") {
      this.pending.clear();
      return ok(undefined);
    }
    const message = this.pending.get("clipboard");
    this.pending.clear();
    if (!message) return ok(undefined);
    return await this.options.bus.publish(message);
  }

  public async revoke(): Promise<Result<ClipboardObserverState>> {
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
      return err(this.permissionError("Clipboard metadata permission is required."));
    }
    if (this.currentState !== "Active") {
      return err(this.permissionError("Clipboard observation is not active."));
    }
    return ok(undefined);
  }

  private hasPermission(source: string): boolean {
    return this.options.permissions
      .list()
      .some((permission) => permission.source === source && permission.granted);
  }

  private validEvent(event: NativeClipboardEvent): boolean {
    return (
      event.type === "changed" &&
      ["text", "image", "file_reference", "unknown"].includes(event.content_type) &&
      typeof event.source_application === "string" &&
      event.source_application.length > 0 &&
      typeof event.sensitive_source === "boolean" &&
      (event.content === undefined || typeof event.content === "string") &&
      (event.content_type !== "text" || event.content !== undefined)
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

  private transitionError(from: ClipboardObserverState, to: ClipboardObserverState): ErrorInfo {
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

export class NativeClipboardEventBridge implements NativeClipboardEventBridgeContract {
  private child: ChildProcessByStdio<null, Readable, Readable> | undefined;
  private lines: Interface | undefined;

  public constructor(private readonly powershellPath = "powershell.exe") {}

  public async start(handler: (event: NativeClipboardEvent) => Promise<void>): Promise<void> {
    if (process.platform !== "win32") {
      throw new Error("Native clipboard observation requires Windows.");
    }
    if (this.child) throw new Error("Native clipboard event bridge is already running.");
    const child = spawn(
      this.powershellPath,
      [
        "-NoLogo",
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        NativeClipboardEventBridge.nativePowerShellScript(),
      ],
      { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] },
    );
    this.child = child;
    const lines = createInterface({ input: child.stdout });
    this.lines = lines;
    lines.on("line", (line) => {
      try {
        const parsed = JSON.parse(line) as NativeClipboardEvent;
        if (parsed.type === "changed") void handler(parsed);
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
Add-Type -AssemblyName System.Windows.Forms
Add-Type -ReferencedAssemblies System.Windows.Forms.dll -TypeDefinition @'
using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;
using System.Windows.Forms;

public sealed class NovaClipboardListener : NativeWindow, IDisposable {
  private const int WmClipboardUpdate = 0x031D; // WM_CLIPBOARDUPDATE
  [DllImport("user32.dll")] private static extern bool AddClipboardFormatListener(IntPtr hwnd);
  [DllImport("user32.dll")] private static extern bool RemoveClipboardFormatListener(IntPtr hwnd);
  public NovaClipboardListener() { CreateHandle(new CreateParams()); AddClipboardFormatListener(Handle); }
  protected override void WndProc(ref Message message) {
    if (message.Msg == WmClipboardUpdate) NovaClipboardHost.EmitSnapshot();
    base.WndProc(ref message);
  }
  public void Dispose() { if (Handle != IntPtr.Zero) { RemoveClipboardFormatListener(Handle); DestroyHandle(); } }
}

public static class NovaClipboardHost {
  private const uint CfUnicodeText = 13;
  private const uint CfDib = 8;
  private const uint CfBitmap = 2;
  private const uint CfHdrop = 15;
  private static NovaClipboardListener Listener;
  [DllImport("user32.dll")] private static extern bool IsClipboardFormatAvailable(uint format);
  [DllImport("user32.dll")] private static extern bool OpenClipboard(IntPtr owner);
  [DllImport("user32.dll")] private static extern bool CloseClipboard();
  [DllImport("user32.dll")] private static extern IntPtr GetClipboardData(uint format);
  [DllImport("kernel32.dll")] private static extern IntPtr GlobalLock(IntPtr handle);
  [DllImport("kernel32.dll")] private static extern bool GlobalUnlock(IntPtr handle);
  [DllImport("user32.dll")] private static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] private static extern uint GetWindowThreadProcessId(IntPtr hwnd, out uint processId);
  private static string Escape(string value) => (value ?? "").Replace("\\", "\\\\").Replace("\"", "\\\"").Replace("\r", "").Replace("\n", " ");
  private static string SourceApplication(out bool sensitive) {
    sensitive = false;
    try {
      uint pid; GetWindowThreadProcessId(GetForegroundWindow(), out pid);
      var name = Process.GetProcessById((int)pid).ProcessName;
      var lower = name.ToLowerInvariant();
      sensitive = lower.Contains("password") || lower.Contains("credential") || lower.Contains("1password") || lower.Contains("bitwarden") || lower.Contains("keepass") || lower.Contains("lastpass") || lower.Contains("dashlane");
      return name;
    } catch { return "unknown"; }
  }
  private static string ReadText() {
    if (!OpenClipboard(IntPtr.Zero)) return "";
    try {
      var data = GetClipboardData(CfUnicodeText);
      if (data == IntPtr.Zero) return "";
      var pointer = GlobalLock(data);
      if (pointer == IntPtr.Zero) return "";
      try { return Marshal.PtrToStringUni(pointer, 524288) ?? ""; } finally { GlobalUnlock(data); }
    } finally { CloseClipboard(); }
  }
  public static void EmitSnapshot() {
    try {
      bool sensitive; var source = SourceApplication(out sensitive);
      string contentType = "unknown"; string content = "";
      if (IsClipboardFormatAvailable(CfUnicodeText)) { contentType = "text"; content = ReadText(); }
      else if (IsClipboardFormatAvailable(CfDib) || IsClipboardFormatAvailable(CfBitmap)) contentType = "image";
      else if (IsClipboardFormatAvailable(CfHdrop)) contentType = "file_reference";
      Console.WriteLine("{\"type\":\"changed\",\"content_type\":\"" + contentType + "\",\"content\":\"" + Escape(content) + "\",\"source_application\":\"" + Escape(source) + "\",\"sensitive_source\":" + (sensitive ? "true" : "false") + "}");
      Console.Out.Flush();
    } catch { }
  }
  public static void Start() { Listener = new NovaClipboardListener(); }
  public static void Stop() { try { Listener?.Dispose(); } catch { } }
}
'@
[NovaClipboardHost]::Start()
try { [System.Windows.Forms.Application]::Run() } finally { [NovaClipboardHost]::Stop() }
`;
  }
}
