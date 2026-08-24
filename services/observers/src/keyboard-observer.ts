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

export type KeyboardActivityState = "active" | "idle";
export type KeyboardModifier = "Alt" | "Control" | "Shift" | "Windows";

export interface KeyboardHotkeyRegistration {
  readonly id: string;
  readonly modifiers: readonly KeyboardModifier[];
  readonly key: string;
}

export type NativeKeyboardEvent =
  | {
      readonly type: "activity";
      readonly state: KeyboardActivityState;
      readonly idle_ms: number;
      readonly correlation_id?: string;
    }
  | {
      readonly type: "hotkey_triggered";
      readonly hotkey_id: string;
      readonly correlation_id?: string;
    };

export interface NativeKeyboardEventBridgeContract {
  start(
    handler: (event: NativeKeyboardEvent) => Promise<void>,
    hotkeys: readonly KeyboardHotkeyRegistration[],
    idleThresholdMs?: number,
  ): Promise<void>;
  stop(): Promise<void>;
}

export interface KeyboardObserverOptions {
  readonly permissions: {
    list(): readonly { readonly source: string; readonly granted: boolean }[];
  };
  readonly bridge: NativeKeyboardEventBridgeContract;
  readonly bus: CommunicationBus;
  readonly hotkeys: readonly KeyboardHotkeyRegistration[];
  readonly now?: () => string;
  readonly idleThresholdMs?: number;
  readonly logger?: StructuredLogger;
}

export type KeyboardObserverState = "Disabled" | "Enabling" | "Active" | "Failed";

const KEYBOARD_PERMISSION = "keyboard_activity";
const DEFAULT_IDLE_THRESHOLD_MS = 120_000;
const IDLE_SAMPLE_INTERVAL_MS = 5_000;
const MAX_IDLE_MS = 24 * 60 * 60 * 1_000;
const supportedModifiers = new Set<KeyboardModifier>(["Alt", "Control", "Shift", "Windows"]);
const supportedNamedKeys = new Set([
  "Space",
  "Enter",
  "Escape",
  "Tab",
  ...Array.from({ length: 12 }, (_, index) => `F${index + 1}`),
]);

export class KeyboardObserver {
  private currentState: KeyboardObserverState = "Disabled";
  private readonly now: () => string;
  private readonly idleThresholdMs: number;
  private readonly logger: StructuredLogger | undefined;
  private readonly hotkeys: readonly KeyboardHotkeyRegistration[];
  private readonly hotkeyIds: ReadonlySet<string>;

  public constructor(private readonly options: KeyboardObserverOptions) {
    this.now = options.now ?? (() => new Date().toISOString());
    this.idleThresholdMs = Math.min(
      MAX_IDLE_MS,
      Math.max(1, Math.floor(options.idleThresholdMs ?? DEFAULT_IDLE_THRESHOLD_MS)),
    );
    this.logger = options.logger;
    this.hotkeys = options.hotkeys.map((hotkey) => ({
      ...hotkey,
      id: hotkey.id,
      modifiers: [...hotkey.modifiers],
    }));
    this.hotkeyIds = new Set(this.hotkeys.map((hotkey) => hotkey.id));
  }

  public state(): KeyboardObserverState {
    return this.currentState;
  }

  public async enable(): Promise<Result<KeyboardObserverState>> {
    if (!this.hasPermission()) {
      this.logger?.warning("keyboard.observer.enable_rejected", {
        error_code: "NOVA-SEC001",
        reason: "permission_missing",
      });
      return err(this.permissionError());
    }
    const hotkeyValidation = validateHotkeys(this.hotkeys);
    if (!hotkeyValidation.ok) {
      this.logger?.error("keyboard.observer.enable_rejected", {
        error_code: hotkeyValidation.error.code,
        reason: "invalid_hotkey_configuration",
      });
      return hotkeyValidation;
    }
    if (this.currentState !== "Disabled") {
      return err(this.transitionError(this.currentState, "Enabling"));
    }
    this.currentState = "Enabling";
    try {
      await this.options.bridge.start(
        async (event) => {
          await this.capture(event);
        },
        this.hotkeys,
        this.idleThresholdMs,
      );
      this.currentState = "Active";
      this.logger?.info("keyboard.observer.enabled", {
        permission: KEYBOARD_PERMISSION,
        hotkey_count: this.hotkeys.length,
        idle_threshold_ms: this.idleThresholdMs,
      });
      return ok(this.currentState);
    } catch (cause) {
      this.currentState = "Failed";
      this.logger?.error("keyboard.observer.enable_failed", { error_code: "NOVA-EVT001" });
      return err(
        this.observerError(
          cause instanceof Error ? cause.message : "Native keyboard activity bridge failed.",
        ),
      );
    }
  }

  public async capture(event: NativeKeyboardEvent): Promise<Result<void>> {
    const permission = await this.ensureActiveAndPermitted();
    if (!permission.ok) {
      this.logger?.warning(
        "keyboard.event.rejected",
        { error_code: permission.error.code, reason: "observer_not_permitted" },
        event.correlation_id,
      );
      return permission;
    }
    const normalized = this.normalize(event);
    if (!normalized.ok) {
      this.logger?.warning(
        "keyboard.event.rejected",
        { error_code: normalized.error.code, reason: "invalid_activity_signal" },
        event.correlation_id,
      );
      return normalized;
    }
    const published = await this.options.bus.publish(normalized.value);
    if (!published.ok) {
      this.logger?.error(
        "keyboard.event.publish_failed",
        { error_code: published.error.code },
        normalized.value.correlation_id,
      );
      return published;
    }
    const payload = normalized.value.payload as Record<string, unknown>;
    this.logger?.info(
      normalized.value.topic === "observer.keyboard.activity"
        ? "keyboard.event.activity"
        : "keyboard.event.hotkey_triggered",
      {
        topic: normalized.value.topic,
        ...(normalized.value.topic === "observer.keyboard.activity"
          ? { state: payload.state, idle_ms: payload.idle_ms }
          : { hotkey_registered: true }),
      },
      normalized.value.correlation_id,
    );
    return ok(undefined);
  }

  public async revoke(): Promise<Result<KeyboardObserverState>> {
    if (this.currentState === "Disabled") {
      return err(this.transitionError(this.currentState, "Disabled"));
    }
    await this.options.bridge.stop();
    this.currentState = "Disabled";
    this.logger?.info("keyboard.observer.revoked", { permission: KEYBOARD_PERMISSION });
    return ok(this.currentState);
  }

  private normalize(event: NativeKeyboardEvent): Result<ReturnType<typeof createMessage>> {
    if (event.type === "activity") {
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
            topic: "observer.keyboard.activity",
            schema_version: "1.0.0",
            correlation_id: event.correlation_id ?? randomUUID(),
            source_service: "observer.keyboard",
            payload: { state: event.state, idle_ms: event.idle_ms },
          }),
        ),
      );
    }

    if (
      !hasExactKeys(event, ["type", "hotkey_id", "correlation_id"]) ||
      typeof event.hotkey_id !== "string" ||
      event.hotkey_id.length === 0 ||
      event.hotkey_id.length > 128 ||
      !this.hotkeyIds.has(event.hotkey_id)
    ) {
      return err(this.invalidEvent());
    }
    return ok(
      this.withTimestamp(
        createMessage({
          topic: "observer.keyboard.hotkey_triggered",
          schema_version: "1.0.0",
          correlation_id: event.correlation_id ?? randomUUID(),
          source_service: "observer.keyboard",
          payload: { hotkey_id: event.hotkey_id },
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
        this.logger?.warning("keyboard.observer.revoked", {
          permission: KEYBOARD_PERMISSION,
          reason: "permission_revoked",
        });
      }
      return err(this.permissionError());
    }
    if (this.currentState !== "Active") {
      return err({
        code: "NOVA-SEC001",
        message: "Keyboard activity observation is not active.",
        retryable: false,
      });
    }
    return ok(undefined);
  }

  private hasPermission(): boolean {
    return this.options.permissions
      .list()
      .some((permission) => permission.source === KEYBOARD_PERMISSION && permission.granted);
  }

  private permissionError(): ErrorInfo {
    return {
      code: "NOVA-SEC001",
      message: "Keyboard activity permission is required.",
      retryable: false,
    };
  }

  private invalidEvent(): ErrorInfo {
    return {
      code: "NOVA-TL002",
      message: "Native keyboard activity event is malformed or unregistered.",
      retryable: false,
    };
  }

  private observerError(message: string): ErrorInfo {
    return { code: "NOVA-EVT001", message, retryable: true };
  }

  private transitionError(from: KeyboardObserverState, to: KeyboardObserverState): ErrorInfo {
    return {
      code: "NOVA-EVT001",
      message: `Illegal observer transition: ${from} -> ${to}.`,
      retryable: false,
      details: { from, to },
    };
  }
}

export class NativeKeyboardEventBridge implements NativeKeyboardEventBridgeContract {
  private child: ChildProcessByStdio<null, Readable, Readable> | undefined;
  private lines: Interface | undefined;

  public constructor(private readonly powershellPath = "powershell.exe") {}

  public async start(
    handler: (event: NativeKeyboardEvent) => Promise<void>,
    hotkeys: readonly KeyboardHotkeyRegistration[],
    idleThresholdMs = DEFAULT_IDLE_THRESHOLD_MS,
  ): Promise<void> {
    if (process.platform !== "win32") {
      throw new Error("Native keyboard activity observation requires Windows.");
    }
    if (this.child) throw new Error("Native keyboard activity bridge is already running.");
    const child = spawn(
      this.powershellPath,
      [
        "-NoLogo",
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        NativeKeyboardEventBridge.nativePowerShellScript(),
      ],
      {
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
        env: {
          ...process.env,
          NOVA_KEYBOARD_HOTKEYS: JSON.stringify(hotkeys),
          NOVA_KEYBOARD_IDLE_THRESHOLD_MS: String(idleThresholdMs),
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

  public static nativePowerShellScript(): string {
    return `
$ErrorActionPreference = 'Stop'
$signature = @'
using System;
using System.Runtime.InteropServices;
public static class NovaKeyboardNative {
  [StructLayout(LayoutKind.Sequential)] public struct LASTINPUTINFO { public uint cbSize; public uint dwTime; }
  [StructLayout(LayoutKind.Sequential)] public struct MSG { public IntPtr hwnd; public uint message; public UIntPtr wParam; public IntPtr lParam; public uint time; public int ptX; public int ptY; }
  [DllImport("user32.dll")] public static extern bool GetLastInputInfo(ref LASTINPUTINFO info);
  [DllImport("user32.dll")] public static extern bool RegisterHotKey(IntPtr hwnd, int id, uint modifiers, uint key);
  [DllImport("user32.dll")] public static extern bool UnregisterHotKey(IntPtr hwnd, int id);
  [DllImport("user32.dll")] public static extern bool PeekMessage(out MSG message, IntPtr hwnd, uint min, uint max, uint remove);
}
'@
Add-Type $signature
$hotkeys = ConvertFrom-Json -InputObject $env:NOVA_KEYBOARD_HOTKEYS
$registered = @{}
$modifierValues = @{ Alt = 0x0001; Control = 0x0002; Shift = 0x0004; Windows = 0x0008 }
function KeyCode([string] $key) {
  if ($key.Length -eq 1) { return [int][char]$key.ToUpperInvariant() }
  switch ($key) {
    'Space' { return 0x20 }
    'Enter' { return 0x0D }
    'Escape' { return 0x1B }
    'Tab' { return 0x09 }
    'F1' { return 0x70 }; 'F2' { return 0x71 }; 'F3' { return 0x72 }; 'F4' { return 0x73 }
    'F5' { return 0x74 }; 'F6' { return 0x75 }; 'F7' { return 0x76 }; 'F8' { return 0x77 }
    'F9' { return 0x78 }; 'F10' { return 0x79 }; 'F11' { return 0x7A }; 'F12' { return 0x7B }
    default { throw "Unsupported registered hotkey key" }
  }
}
$id = 1
foreach ($hotkey in @($hotkeys)) {
  $flags = 0
  foreach ($modifier in @($hotkey.modifiers)) { $flags = $flags -bor $modifierValues[$modifier] }
  $keyCode = KeyCode $hotkey.key
  if (-not [NovaKeyboardNative]::RegisterHotKey([IntPtr]::Zero, $id, $flags, $keyCode)) { throw "Could not register configured hotkey" }
  $registered[$id] = $hotkey.id
  $id += 1
}
$threshold = [int][Environment]::GetEnvironmentVariable('NOVA_KEYBOARD_IDLE_THRESHOLD_MS')
if ($threshold -le 0) { $threshold = ${DEFAULT_IDLE_THRESHOLD_MS} }
$lastState = ''
$lastIdleCheck = 0
try {
  while ($true) {
    $now = [Environment]::TickCount
    if (($lastState -eq '') -or (($now - $lastIdleCheck) -ge ${IDLE_SAMPLE_INTERVAL_MS})) {
      $info = New-Object NovaKeyboardNative+LASTINPUTINFO
      $info.cbSize = [Runtime.InteropServices.Marshal]::SizeOf($info)
      [NovaKeyboardNative]::GetLastInputInfo([ref]$info) | Out-Null
      $idle = [Environment]::TickCount - $info.dwTime
      $state = if ($idle -ge $threshold) { 'idle' } else { 'active' }
      if ($state -ne $lastState) {
        @{ type = 'activity'; state = $state; idle_ms = [Math]::Max(0, $idle) } | ConvertTo-Json -Compress
        [Console]::Out.Flush()
        $lastState = $state
      }
      $lastIdleCheck = $now
    }
    $message = New-Object NovaKeyboardNative+MSG
    while ([NovaKeyboardNative]::PeekMessage([ref]$message, [IntPtr]::Zero, 0, 0, 1)) {
      if ($message.message -eq 0x0312 -and $registered.ContainsKey([int]$message.wParam)) {
        @{ type = 'hotkey_triggered'; hotkey_id = $registered[[int]$message.wParam] } | ConvertTo-Json -Compress
        [Console]::Out.Flush()
      }
    }
    Start-Sleep -Milliseconds 100
  }
}
finally {
  for ($registeredId = 1; $registeredId -lt $id; $registeredId += 1) { [NovaKeyboardNative]::UnregisterHotKey([IntPtr]::Zero, $registeredId) | Out-Null }
}
`;
  }
}

function validateHotkeys(hotkeys: readonly KeyboardHotkeyRegistration[]): Result<void> {
  const ids = new Set<string>();
  for (const hotkey of hotkeys) {
    if (
      !hotkey.id ||
      hotkey.id.length > 128 ||
      ids.has(hotkey.id) ||
      !hotkey.key ||
      hotkey.key.length > 32 ||
      hotkey.modifiers.length > 4 ||
      new Set(hotkey.modifiers).size !== hotkey.modifiers.length ||
      hotkey.modifiers.some((modifier) => !supportedModifiers.has(modifier)) ||
      !isSupportedHotkeyKey(hotkey.key)
    ) {
      return err({
        code: "NOVA-CFG001",
        message: "Keyboard hotkey configuration is invalid or duplicated.",
        retryable: false,
      });
    }
    ids.add(hotkey.id);
  }
  return ok(undefined);
}

function isSupportedHotkeyKey(key: string): boolean {
  return /^[A-Za-z0-9]$/.test(key) || supportedNamedKeys.has(key);
}

function hasExactKeys(value: object, keys: readonly string[]): boolean {
  const allowed = new Set(keys);
  return Object.keys(value).every((key) => allowed.has(key));
}

function parseNativeEvent(line: string): Result<NativeKeyboardEvent> {
  try {
    const candidate = JSON.parse(line) as Record<string, unknown>;
    if (candidate.type === "activity") {
      if (!hasExactKeys(candidate, ["type", "state", "idle_ms"])) {
        return err({
          code: "NOVA-TL002",
          message: "Native keyboard event is invalid.",
          retryable: false,
        });
      }
      if (
        typeof candidate.state !== "string" ||
        (candidate.state !== "active" && candidate.state !== "idle") ||
        typeof candidate.idle_ms !== "number" ||
        !Number.isInteger(candidate.idle_ms) ||
        candidate.idle_ms < 0 ||
        candidate.idle_ms > MAX_IDLE_MS
      ) {
        return err({
          code: "NOVA-TL002",
          message: "Native keyboard event is invalid.",
          retryable: false,
        });
      }
      return ok({
        type: "activity",
        state: candidate.state,
        idle_ms: candidate.idle_ms,
      });
    }
    if (
      candidate.type === "hotkey_triggered" &&
      hasExactKeys(candidate, ["type", "hotkey_id"]) &&
      typeof candidate.hotkey_id === "string" &&
      candidate.hotkey_id.length > 0 &&
      candidate.hotkey_id.length <= 128
    ) {
      return ok({ type: "hotkey_triggered", hotkey_id: candidate.hotkey_id });
    }
  } catch {
    return err({
      code: "NOVA-TL002",
      message: "Native keyboard event is invalid.",
      retryable: false,
    });
  }
  return err({
    code: "NOVA-TL002",
    message: "Native keyboard event is invalid.",
    retryable: false,
  });
}
