import { randomUUID } from "node:crypto";
import { spawn, type ChildProcessByStdio } from "node:child_process";
import type { Readable } from "node:stream";
import { createInterface, type Interface } from "node:readline";
import {
  createMessage,
  err,
  ok,
  type CommunicationBus,
  type ErrorInfo,
  type Result,
} from "@nova/shared";

export type WindowsApplicationEventType = "application.launched" | "application.closed";
export type WindowsWindowEventType =
  "window.opened" | "window.closed" | "window.focused" | "window.title_changed";
export type NativeWindowsEventType = WindowsApplicationEventType | WindowsWindowEventType;
export type WindowsObserverState = "Disabled" | "Enabling" | "Active" | "Degraded" | "Failed";

export interface NativeApplicationSnapshot {
  readonly process_id: number;
  readonly application_name: string;
}

export interface NativeWindowSnapshot {
  readonly window_id: string;
  readonly process_id: number;
  readonly application_name: string;
  readonly title: string;
  readonly monitor_id: string;
  readonly virtual_desktop_id: string;
  readonly z_order: number;
}

export type NativeDesktopEvent =
  | {
      readonly type: WindowsApplicationEventType;
      readonly application: NativeApplicationSnapshot;
      readonly correlation_id?: string;
    }
  | {
      readonly type: WindowsWindowEventType;
      readonly window: NativeWindowSnapshot;
      readonly correlation_id?: string;
    };

export interface ObserverPermissionReader {
  list(): readonly { readonly source: string; readonly granted: boolean }[];
}

export interface NativeWindowsEventBridgeContract {
  start(handler: (event: NativeDesktopEvent) => Promise<void>): Promise<void>;
  stop(): Promise<void>;
}

export interface WindowsApplicationObserverOptions {
  readonly permissions: ObserverPermissionReader;
  readonly bridge: NativeWindowsEventBridgeContract;
  readonly bus: CommunicationBus;
  readonly now?: () => string;
  readonly maxTitleLength?: number;
}

const applicationSources = new Set(["applications", "windows"]);
export class WindowsApplicationObserver {
  private currentState: WindowsObserverState = "Disabled";
  private readonly now: () => string;
  private readonly maxTitleLength: number;

  public constructor(private readonly options: WindowsApplicationObserverOptions) {
    this.now = options.now ?? (() => new Date().toISOString());
    this.maxTitleLength = options.maxTitleLength ?? 512;
  }

  public state(): WindowsObserverState {
    return this.currentState;
  }

  public async enable(): Promise<Result<WindowsObserverState>> {
    const permission = this.requirePermissions();
    if (!permission.ok) return permission;
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
    } catch (error: unknown) {
      this.currentState = "Failed";
      return err(
        this.observerError(error instanceof Error ? error.message : "Native bridge failed."),
      );
    }
  }

  public async capture(event: NativeDesktopEvent): Promise<Result<void>> {
    const permission = await this.ensureActiveAndPermitted();
    if (!permission.ok) return permission;
    const normalized = this.normalize(event);
    if (!normalized.ok) return normalized;
    return this.options.bus.publish(normalized.value);
  }

  public async revoke(): Promise<Result<WindowsObserverState>> {
    if (this.currentState === "Disabled") {
      return err(this.transitionError(this.currentState, "Disabled"));
    }
    await this.options.bridge.stop();
    this.currentState = "Disabled";
    return ok(this.currentState);
  }

  private async ensureActiveAndPermitted(): Promise<Result<void>> {
    if (!this.hasRequiredPermissions()) {
      if (this.currentState !== "Disabled") {
        await this.options.bridge.stop();
        this.currentState = "Disabled";
      }
      return err(
        this.permissionError("Applications and windows observation permissions are required."),
      );
    }
    if (this.currentState !== "Active") {
      return err(this.permissionError("Windows observation is not active."));
    }
    return ok(undefined);
  }

  private requirePermissions(): Result<void> {
    if (!this.hasRequiredPermissions()) {
      return err(
        this.permissionError("Applications and windows observation permissions are required."),
      );
    }
    return ok(undefined);
  }

  private hasRequiredPermissions(): boolean {
    const grants = new Map(
      this.options.permissions.list().map((grant) => [grant.source, grant.granted]),
    );
    return [...applicationSources].every((source) => grants.get(source) === true);
  }

  private normalize(event: NativeDesktopEvent): Result<ReturnType<typeof createMessage>> {
    if (event.type === "application.launched" || event.type === "application.closed") {
      if (
        !("application" in event) ||
        !Number.isInteger(event.application.process_id) ||
        event.application.process_id < 0
      ) {
        return err(this.permissionError("Native application event is malformed."));
      }
      return ok(
        this.withTimestamp(
          createMessage({
            topic: `observer.${event.type}`,
            schema_version: "1.0.0",
            correlation_id: event.correlation_id ?? randomUUID(),
            source_service: "observer.windows",
            payload: {
              process_id: event.application.process_id,
              application_name: this.bound(event.application.application_name, 160),
            },
          }),
        ),
      );
    }

    if (
      !(
        event.type === "window.opened" ||
        event.type === "window.closed" ||
        event.type === "window.focused" ||
        event.type === "window.title_changed"
      ) ||
      !("window" in event) ||
      !Number.isInteger(event.window.process_id) ||
      event.window.process_id < 0 ||
      event.window.window_id.length === 0
    ) {
      return err(this.permissionError("Native window event is malformed."));
    }
    return ok(
      this.withTimestamp(
        createMessage({
          topic: `observer.${event.type}`,
          schema_version: "1.0.0",
          correlation_id: event.correlation_id ?? randomUUID(),
          source_service: "observer.windows",
          payload: {
            window_id: this.bound(event.window.window_id, 120),
            process_id: event.window.process_id,
            application_name: this.bound(event.window.application_name, 160),
            title: this.bound(event.window.title, this.maxTitleLength),
            monitor_id: this.bound(event.window.monitor_id, 120),
            virtual_desktop_id: this.bound(event.window.virtual_desktop_id, 120),
            z_order: Number.isInteger(event.window.z_order) ? event.window.z_order : 0,
          },
        }),
      ),
    );
  }

  private withTimestamp<TPayload>(message: ReturnType<typeof createMessage<TPayload>>) {
    return { ...message, timestamp: this.now() };
  }

  private bound(value: string, maxLength: number): string {
    return value.slice(0, maxLength);
  }

  private permissionError(message: string): ErrorInfo {
    return { code: "NOVA-SEC001", message, retryable: false };
  }

  private observerError(message: string): ErrorInfo {
    return { code: "NOVA-EVT001", message, retryable: true };
  }

  private transitionError(from: WindowsObserverState, to: WindowsObserverState): ErrorInfo {
    return {
      code: "NOVA-EVT001",
      message: `Illegal observer transition: ${from} -> ${to}.`,
      retryable: false,
      details: { from, to },
    };
  }
}

export class NativeWindowsEventBridge implements NativeWindowsEventBridgeContract {
  private child: ChildProcessByStdio<null, Readable, Readable> | undefined;
  private lines: Interface | undefined;

  public constructor(private readonly powershellPath = "powershell.exe") {}

  public async start(handler: (event: NativeDesktopEvent) => Promise<void>): Promise<void> {
    if (process.platform !== "win32")
      throw new Error("Native Windows observation requires Windows.");
    if (this.child) throw new Error("Native Windows event bridge is already running.");
    const child = spawn(
      this.powershellPath,
      [
        "-NoLogo",
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        NativeWindowsEventBridge.nativePowerShellScript(),
      ],
      { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] },
    );
    this.child = child;
    const lines = createInterface({ input: child.stdout });
    this.lines = lines;
    lines.on("line", (line) => {
      try {
        const parsed = JSON.parse(line) as NativeDesktopEvent;
        void handler(parsed);
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
Add-Type -ReferencedAssemblies System.Management.dll -TypeDefinition @'
using System;
using System.Diagnostics;
using System.Management;
using System.Runtime.InteropServices;
using System.Text;
public static class NovaNativeWindowHooks {
  public delegate void WinEventDelegate(IntPtr hook, uint eventType, IntPtr hwnd, int objectId, int childId, uint threadId, uint time);
  public static WinEventDelegate Callback;
  public static IntPtr Hook;
  public static ManagementEventWatcher StartWatcher;
  public static ManagementEventWatcher StopWatcher;
  [DllImport("user32.dll")] public static extern IntPtr SetWinEventHook(uint min, uint max, IntPtr module, WinEventDelegate callback, uint process, uint thread, uint flags);
  [DllImport("user32.dll")] public static extern bool UnhookWinEvent(IntPtr hook);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr hwnd, StringBuilder text, int max);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hwnd, out uint processId);
  [DllImport("user32.dll")] public static extern IntPtr MonitorFromWindow(IntPtr hwnd, uint flags);
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)] public struct Rect { public int Left; public int Top; public int Right; public int Bottom; }
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)] public struct MonitorInfoEx { public int cbSize; public Rect Monitor; public Rect Work; public uint Flags; [MarshalAs(UnmanagedType.ByValTStr, SizeConst=32)] public string Device; }
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern bool GetMonitorInfo(IntPtr monitor, ref MonitorInfoEx info);
  [DllImport("user32.dll")] public static extern IntPtr GetWindow(IntPtr hwnd, uint command);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [StructLayout(LayoutKind.Sequential)] public struct Msg { public IntPtr Hwnd; public uint Message; public UIntPtr WParam; public IntPtr LParam; public uint Time; public int X; public int Y; }
  [DllImport("user32.dll")] public static extern int GetMessage(out Msg message, IntPtr hwnd, uint min, uint max);
  [DllImport("user32.dll")] public static extern bool TranslateMessage(ref Msg message);
  [DllImport("user32.dll")] public static extern IntPtr DispatchMessage(ref Msg message);
  [ComImport, Guid("a5cd92ff-29be-454c-8d04-d82879fb3f1b"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)] public interface IVirtualDesktopManager { int IsWindowOnCurrentVirtualDesktop(IntPtr hwnd); int GetWindowDesktopId(IntPtr hwnd, out Guid desktopId); int MoveWindowToDesktop(IntPtr hwnd, ref Guid desktopId); }
  [ComImport, Guid("aa509086-5ca9-4c25-8f95-589d3c07b48a")] public class VirtualDesktopManagerClass { }
  public const uint EventSystemForeground = 3;
  public const uint EventObjectCreate = 0x8000;
  public const uint EventObjectDestroy = 0x8001;
  public const uint EventObjectNameChange = 0x800C;
  public const int ObjectIdWindow = 0;
  public const uint WineventOutOfContext = 0;
  public const uint GwHwndPrev = 3;
  public static string Escape(string value) => value.Replace("\\", "\\\\").Replace("\"", "\\\"").Replace("\r", "").Replace("\n", " ");
  public static void Emit(string json) { lock (typeof(NovaNativeWindowHooks)) { Console.WriteLine(json); Console.Out.Flush(); } }
  public static void StartProcessWatchers() {
    StartWatcher = new ManagementEventWatcher(new WqlEventQuery("SELECT * FROM Win32_ProcessStartTrace"));
    StopWatcher = new ManagementEventWatcher(new WqlEventQuery("SELECT * FROM Win32_ProcessStopTrace"));
    StartWatcher.EventArrived += (sender, args) => { var e = args.NewEvent; Emit("{\\"type\\":\\"application.launched\\",\\"application\\":{\\"process_id\\":" + Convert.ToInt32(e[\\"ProcessId\\"]) + ",\\"application_name\\":\\"" + Escape(Convert.ToString(e[\\"ProcessName\\"]) ?? "unknown") + "\\"}}"); };
    StopWatcher.EventArrived += (sender, args) => { var e = args.NewEvent; Emit("{\\"type\\":\\"application.closed\\",\\"application\\":{\\"process_id\\":" + Convert.ToInt32(e[\\"ProcessId\\"]) + ",\\"application_name\\":\\"" + Escape(Convert.ToString(e[\\"ProcessName\\"]) ?? "unknown") + "\\"}}"); };
    StartWatcher.Start(); StopWatcher.Start();
  }
  public static void StopProcessWatchers() { try { StartWatcher?.Stop(); StartWatcher?.Dispose(); } catch { } try { StopWatcher?.Stop(); StopWatcher?.Dispose(); } catch { } }
  public static string Snapshot(string type, IntPtr hwnd) {
    if (hwnd == IntPtr.Zero) return "";
    var titleBuffer = new StringBuilder(1024);
    GetWindowText(hwnd, titleBuffer, titleBuffer.Capacity);
    uint pid;
    GetWindowThreadProcessId(hwnd, out pid);
    string app = "unknown";
    try { app = Process.GetProcessById((int)pid).ProcessName; } catch { }
    int z = 0; var current = hwnd;
    while ((current = GetWindow(current, GwHwndPrev)) != IntPtr.Zero && z < 512) z++;
    string monitorId = "unknown"; var monitor = MonitorFromWindow(hwnd, 2);
    if (monitor != IntPtr.Zero) { var info = new MonitorInfoEx(); info.cbSize = Marshal.SizeOf(typeof(MonitorInfoEx)); if (GetMonitorInfo(monitor, ref info)) monitorId = info.Device ?? "unknown"; }
    string virtualDesktopId = "unknown";
    try { var manager = (IVirtualDesktopManager)new VirtualDesktopManagerClass(); Guid desktopId; if (manager.GetWindowDesktopId(hwnd, out desktopId) == 0) virtualDesktopId = desktopId.ToString(); } catch { }
    string windowId = "hwnd:" + hwnd.ToInt64().ToString("X");
    return "{\"type\":\"window." + type + "\",\"window\":{\"window_id\":\"" + Escape(windowId) + "\",\"process_id\":" + pid + ",\"application_name\":\"" + Escape(app) + "\",\"title\":\"" + Escape(titleBuffer.ToString()) + "\",\"monitor_id\":\"" + Escape(monitorId) + "\",\"virtual_desktop_id\":\"" + Escape(virtualDesktopId) + "\",\"z_order\":" + z + "}}";
  }
}
'@
$callback = [NovaNativeWindowHooks+WinEventDelegate]{ param($hook, $eventType, $hwnd, $objectId, $childId, $threadId, $time)
  if ($objectId -eq [NovaNativeWindowHooks]::ObjectIdWindow) {
    $kind = if ($eventType -eq [NovaNativeWindowHooks]::EventSystemForeground) { 'focused' } elseif ($eventType -eq [NovaNativeWindowHooks]::EventObjectCreate) { 'opened' } elseif ($eventType -eq [NovaNativeWindowHooks]::EventObjectDestroy) { 'closed' } else { 'title_changed' }
    $json = [NovaNativeWindowHooks]::Snapshot($kind, $hwnd)
    if ($json) { [NovaNativeWindowHooks]::Emit($json) }
  }
}
[NovaNativeWindowHooks]::Callback = $callback
[NovaNativeWindowHooks]::Hook = [NovaNativeWindowHooks]::SetWinEventHook(3, 0x800C, [IntPtr]::Zero, $callback, 0, 0, 0)
[NovaNativeWindowHooks]::StartProcessWatchers()
$foreground = [NovaNativeWindowHooks]::GetForegroundWindow(); if ($foreground -ne [IntPtr]::Zero) { [NovaNativeWindowHooks]::Emit([NovaNativeWindowHooks]::Snapshot('focused', $foreground)) }
$msg = New-Object NovaNativeWindowHooks+Msg
try { while ([NovaNativeWindowHooks]::GetMessage([ref]$msg, [IntPtr]::Zero, 0, 0) -gt 0) { [NovaNativeWindowHooks]::TranslateMessage([ref]$msg) | Out-Null; [NovaNativeWindowHooks]::DispatchMessage([ref]$msg) | Out-Null } } finally { [NovaNativeWindowHooks]::StopProcessWatchers(); if ([NovaNativeWindowHooks]::Hook -ne [IntPtr]::Zero) { [NovaNativeWindowHooks]::UnhookWinEvent([NovaNativeWindowHooks]::Hook) | Out-Null } }
`;
  }
}
