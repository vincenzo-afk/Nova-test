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
  type StructuredLogger,
} from "@nova/shared";

export type MouseActivityState = "active" | "idle";

export interface NativeMousePosition {
  readonly x: number;
  readonly y: number;
  readonly screen_width: number;
  readonly screen_height: number;
}

export type NativeMouseEvent = {
  readonly type: "activity";
  readonly state: MouseActivityState;
  readonly idle_ms: number;
  readonly correlation_id?: string;
};

export interface NativeMouseEventBridgeContract {
  start(
    handler: (event: NativeMouseEvent) => Promise<void>,
    idleThresholdMs?: number,
  ): Promise<void>;
  stop(): Promise<void>;
  readPosition(): Promise<NativeMousePosition>;
}

export interface MouseObserverOptions {
  readonly permissions: {
    list(): readonly { readonly source: string; readonly granted: boolean }[];
  };
  readonly bridge: NativeMouseEventBridgeContract;
  readonly bus: CommunicationBus;
  readonly now?: () => string;
  readonly idleThresholdMs?: number;
  readonly logger?: StructuredLogger;
}

export type MouseObserverState = "Disabled" | "Enabling" | "Active" | "Failed";

const MOUSE_PERMISSION = "mouse_activity";
const DEFAULT_IDLE_THRESHOLD_MS = 120_000;
const IDLE_SAMPLE_INTERVAL_MS = 5_000;
const MAX_IDLE_MS = 24 * 60 * 60 * 1_000;
const MAX_SCREEN_DIMENSION = 100_000;

export class MouseObserver {
  private currentState: MouseObserverState = "Disabled";
  private readonly now: () => string;
  private readonly idleThresholdMs: number;
  private readonly logger: StructuredLogger | undefined;

  public constructor(private readonly options: MouseObserverOptions) {
    this.now = options.now ?? (() => new Date().toISOString());
    this.idleThresholdMs = Math.min(
      MAX_IDLE_MS,
      Math.max(1, Math.floor(options.idleThresholdMs ?? DEFAULT_IDLE_THRESHOLD_MS)),
    );
    this.logger = options.logger;
  }

  public state(): MouseObserverState {
    return this.currentState;
  }

  public async enable(): Promise<Result<MouseObserverState>> {
    if (!this.hasPermission()) {
      this.logger?.warning("mouse.observer.enable_rejected", {
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
        await this.capture(event);
      }, this.idleThresholdMs);
      this.currentState = "Active";
      this.logger?.info("mouse.observer.enabled", {
        permission: MOUSE_PERMISSION,
        idle_threshold_ms: this.idleThresholdMs,
        idle_sample_interval_ms: IDLE_SAMPLE_INTERVAL_MS,
      });
      return ok(this.currentState);
    } catch (cause) {
      this.currentState = "Failed";
      this.logger?.error("mouse.observer.enable_failed", { error_code: "NOVA-EVT001" });
      return err(
        this.observerError(
          cause instanceof Error ? cause.message : "Native mouse activity bridge failed.",
        ),
      );
    }
  }

  public async capture(event: NativeMouseEvent): Promise<Result<void>> {
    const permission = await this.ensureActiveAndPermitted();
    if (!permission.ok) {
      this.logger?.warning(
        "mouse.event.rejected",
        { error_code: permission.error.code, reason: "observer_not_permitted" },
        event.correlation_id,
      );
      return permission;
    }
    const normalized = this.normalize(event);
    if (!normalized.ok) {
      this.logger?.warning(
        "mouse.event.rejected",
        { error_code: normalized.error.code, reason: "invalid_activity_signal" },
        event.correlation_id,
      );
      return normalized;
    }
    const published = await this.options.bus.publish(normalized.value);
    if (!published.ok) {
      this.logger?.error(
        "mouse.event.publish_failed",
        { error_code: published.error.code },
        normalized.value.correlation_id,
      );
      return published;
    }
    const payload = normalized.value.payload as {
      readonly state: MouseActivityState;
      readonly idle_ms: number;
    };
    this.logger?.info(
      "mouse.event.activity",
      {
        topic: normalized.value.topic,
        state: payload.state,
        idle_ms: payload.idle_ms,
      },
      normalized.value.correlation_id,
    );
    return ok(undefined);
  }

  public async readCurrentPosition(): Promise<Result<NativeMousePosition>> {
    const permission = await this.ensureActiveAndPermitted();
    if (!permission.ok) return permission as Result<NativeMousePosition>;
    try {
      const position = await this.options.bridge.readPosition();
      const normalized = normalizePosition(position);
      if (!normalized.ok) {
        this.logger?.warning("mouse.position.rejected", {
          error_code: normalized.error.code,
          reason: "invalid_native_position",
        });
        return normalized;
      }
      this.logger?.info("mouse.position.read", {
        screen_width: normalized.value.screen_width,
        screen_height: normalized.value.screen_height,
      });
      return normalized;
    } catch (cause) {
      this.logger?.error("mouse.position.read_failed", { error_code: "NOVA-EVT001" });
      return err(
        this.observerError(
          cause instanceof Error ? cause.message : "Native cursor position read failed.",
        ),
      );
    }
  }

  public async revoke(): Promise<Result<MouseObserverState>> {
    if (this.currentState === "Disabled") {
      return err(this.transitionError(this.currentState, "Disabled"));
    }
    await this.options.bridge.stop();
    this.currentState = "Disabled";
    this.logger?.info("mouse.observer.revoked", { permission: MOUSE_PERMISSION });
    return ok(this.currentState);
  }

  private normalize(event: NativeMouseEvent): Result<ReturnType<typeof createMessage>> {
    if (
      !hasExactKeys(event, ["type", "state", "idle_ms", "correlation_id"]) ||
      (event.state !== "active" && event.state !== "idle") ||
      !Number.isInteger(event.idle_ms) ||
      event.idle_ms < 0 ||
      event.idle_ms > MAX_IDLE_MS
    ) {
      return err(this.invalidEvent());
    }
    return ok(
      this.withTimestamp(
        createMessage({
          topic: "observer.mouse.activity",
          schema_version: "1.0.0",
          correlation_id: event.correlation_id ?? randomUUID(),
          source_service: "observer.mouse",
          payload: { state: event.state, idle_ms: event.idle_ms },
        }),
      ),
    );
  }

  private withTimestamp<TPayload>(message: ReturnType<typeof createMessage<TPayload>>) {
    return { ...message, timestamp: this.now() };
  }

  private async ensureActiveAndPermitted(): Promise<Result<void>> {
    if (!this.hasPermission()) {
      if (this.currentState !== "Disabled") {
        await this.options.bridge.stop();
        this.currentState = "Disabled";
        this.logger?.warning("mouse.observer.revoked", {
          permission: MOUSE_PERMISSION,
          reason: "permission_revoked",
        });
      }
      return err(this.permissionError());
    }
    if (this.currentState !== "Active") {
      return err({
        code: "NOVA-SEC001",
        message: "Mouse activity observation is not active.",
        retryable: false,
      });
    }
    return ok(undefined);
  }

  private hasPermission(): boolean {
    return this.options.permissions
      .list()
      .some((permission) => permission.source === MOUSE_PERMISSION && permission.granted);
  }

  private permissionError(): ErrorInfo {
    return {
      code: "NOVA-SEC001",
      message: "Mouse activity permission is required.",
      retryable: false,
    };
  }

  private invalidEvent(): ErrorInfo {
    return {
      code: "NOVA-TL002",
      message: "Native mouse activity event is malformed.",
      retryable: false,
    };
  }

  private transitionError(from: MouseObserverState, to: MouseObserverState): ErrorInfo {
    return {
      code: "NOVA-EVT001",
      message: `Illegal observer transition: ${from} -> ${to}.`,
      retryable: false,
      details: { from, to },
    };
  }

  private observerError(message: string): ErrorInfo {
    return { code: "NOVA-EVT001", message, retryable: true };
  }
}

export class NativeMouseEventBridge implements NativeMouseEventBridgeContract {
  private child: ChildProcessByStdio<null, Readable, Readable> | undefined;
  private lines: Interface | undefined;

  public constructor(private readonly powershellPath = "powershell.exe") {}

  public async start(
    handler: (event: NativeMouseEvent) => Promise<void>,
    idleThresholdMs = DEFAULT_IDLE_THRESHOLD_MS,
  ): Promise<void> {
    if (process.platform !== "win32") {
      throw new Error("Native mouse activity observation requires Windows.");
    }
    if (this.child) throw new Error("Native mouse activity bridge is already running.");
    const child = spawn(
      this.powershellPath,
      [
        "-NoLogo",
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        NativeMouseEventBridge.nativePowerShellScript(),
      ],
      {
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
        env: {
          ...process.env,
          NOVA_MOUSE_IDLE_THRESHOLD_MS: String(idleThresholdMs),
        },
      },
    );
    this.child = child;
    const lines = createInterface({ input: child.stdout });
    this.lines = lines;
    lines.on("line", (line) => {
      const parsed = parseNativeEvent(line);
      if (parsed.ok) void handler(parsed.value);
    });
    child.once("error", () => {
      this.child = undefined;
      this.lines = undefined;
    });
    child.once("close", () => {
      this.child = undefined;
      this.lines = undefined;
    });
  }

  public async stop(): Promise<void> {
    this.lines?.close();
    this.lines = undefined;
    const child = this.child;
    this.child = undefined;
    if (!child) return;
    child.kill();
    await new Promise<void>((resolve) => child.once("close", () => resolve()));
  }

  public async readPosition(): Promise<NativeMousePosition> {
    if (process.platform !== "win32") {
      throw new Error("Native cursor position reads require Windows.");
    }
    const child = spawn(
      this.powershellPath,
      [
        "-NoLogo",
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        NativeMouseEventBridge.nativePositionPowerShellScript(),
      ],
      { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] },
    );
    const output: string[] = [];
    const lines = createInterface({ input: child.stdout });
    lines.on("line", (line) => output.push(line));
    return await new Promise<NativeMousePosition>((resolve, reject) => {
      child.once("error", reject);
      child.once("close", (code) => {
        lines.close();
        if (code !== 0 || output.length === 0) {
          reject(new Error("Native cursor position read failed."));
          return;
        }
        try {
          resolve(JSON.parse(output.at(-1) ?? "") as NativeMousePosition);
        } catch {
          reject(new Error("Native cursor position response was malformed."));
        }
      });
    });
  }

  public static nativePowerShellScript(): string {
    return `
$ErrorActionPreference = 'Stop'
$signature = @'
using System;
using System.Runtime.InteropServices;
public static class NovaMouseNative {
  [StructLayout(LayoutKind.Sequential)] public struct LASTINPUTINFO { public uint cbSize; public uint dwTime; }
  [DllImport("user32.dll")] public static extern bool GetLastInputInfo(ref LASTINPUTINFO info);
}
'@
Add-Type $signature
$threshold = [int][Environment]::GetEnvironmentVariable('NOVA_MOUSE_IDLE_THRESHOLD_MS')
if ($threshold -le 0) { $threshold = ${DEFAULT_IDLE_THRESHOLD_MS} }
$lastState = ''
$lastIdleCheck = 0
try {
  while ($true) {
    $now = [Environment]::TickCount
    if (($lastState -eq '') -or (($now - $lastIdleCheck) -ge ${IDLE_SAMPLE_INTERVAL_MS})) {
      $info = New-Object NovaMouseNative+LASTINPUTINFO
      $info.cbSize = [Runtime.InteropServices.Marshal]::SizeOf($info)
      [NovaMouseNative]::GetLastInputInfo([ref]$info) | Out-Null
      $idle = [Environment]::TickCount - $info.dwTime
      $state = if ($idle -ge $threshold) { 'idle' } else { 'active' }
      if ($state -ne $lastState) {
        @{ type = 'activity'; state = $state; idle_ms = [Math]::Max(0, $idle) } | ConvertTo-Json -Compress
        [Console]::Out.Flush()
        $lastState = $state
      }
      $lastIdleCheck = $now
    }
    Start-Sleep -Milliseconds 100
  }
}
finally { }
`;
  }

  public static nativePositionPowerShellScript(): string {
    return `
$ErrorActionPreference = 'Stop'
$signature = @'
using System;
using System.Runtime.InteropServices;
public static class NovaMousePositionNative {
  [StructLayout(LayoutKind.Sequential)] public struct POINT { public int X; public int Y; }
  [DllImport("user32.dll")] public static extern bool GetCursorPos(out POINT point);
  [DllImport("user32.dll")] public static extern int GetSystemMetrics(int index);
}
'@
Add-Type $signature
$point = New-Object NovaMousePositionNative+POINT
if (-not [NovaMousePositionNative]::GetCursorPos([ref]$point)) { throw 'Could not read cursor position' }
@{
  x = $point.X
  y = $point.Y
  screen_width = [NovaMousePositionNative]::GetSystemMetrics(78)
  screen_height = [NovaMousePositionNative]::GetSystemMetrics(79)
} | ConvertTo-Json -Compress
`;
  }
}

function normalizePosition(position: NativeMousePosition): Result<NativeMousePosition> {
  if (
    !Number.isInteger(position.x) ||
    !Number.isInteger(position.y) ||
    !Number.isInteger(position.screen_width) ||
    !Number.isInteger(position.screen_height) ||
    position.screen_width <= 0 ||
    position.screen_height <= 0 ||
    position.screen_width > MAX_SCREEN_DIMENSION ||
    position.screen_height > MAX_SCREEN_DIMENSION ||
    position.x < 0 ||
    position.y < 0 ||
    position.x >= position.screen_width ||
    position.y >= position.screen_height
  ) {
    return err({
      code: "NOVA-TL002",
      message: "Native cursor position is malformed or outside the screen bounds.",
      retryable: false,
    });
  }
  return ok({ ...position });
}

function hasExactKeys(value: object, keys: readonly string[]): boolean {
  const allowed = new Set(keys);
  return Object.keys(value).every((key) => allowed.has(key));
}

function parseNativeEvent(line: string): Result<NativeMouseEvent> {
  try {
    const candidate = JSON.parse(line) as Record<string, unknown>;
    if (
      !hasExactKeys(candidate, ["type", "state", "idle_ms"]) ||
      candidate.type !== "activity" ||
      (candidate.state !== "active" && candidate.state !== "idle") ||
      typeof candidate.idle_ms !== "number" ||
      !Number.isInteger(candidate.idle_ms) ||
      candidate.idle_ms < 0 ||
      candidate.idle_ms > MAX_IDLE_MS
    ) {
      return err({
        code: "NOVA-TL002",
        message: "Native mouse event is invalid.",
        retryable: false,
      });
    }
    return ok({ type: "activity", state: candidate.state, idle_ms: candidate.idle_ms });
  } catch {
    return err({ code: "NOVA-TL002", message: "Native mouse event is invalid.", retryable: false });
  }
}
