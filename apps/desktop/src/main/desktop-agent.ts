import { spawn } from "node:child_process";
import { err, ok, type Result } from "@nova/shared";
import type { ExecutionResult, RegisteredTool, ToolRegistration } from "@nova/runtime";

export interface DesktopFocusState {
  readonly focused_window: {
    readonly window_id: string;
  } | null;
}

export interface DesktopPermissionReader {
  list(): readonly { readonly source: string; readonly granted: boolean }[];
}

export interface ScreenshotRequest {
  readonly task_id: string;
  readonly target: "screen" | "focused-window";
  readonly window_id?: string;
  readonly max_bytes?: number;
}

export interface NativeScreenshot {
  readonly mime_type: "image/png";
  readonly width: number;
  readonly height: number;
  readonly byte_length: number;
  readonly data_base64: string;
  readonly captured_at: string;
}

export type UiControlTarget = {
  readonly name?: string;
  readonly automation_id?: string;
  readonly control_type?: string;
};

export interface UiActionRequest {
  readonly task_id: string;
  readonly action_id: string;
  readonly action: "invoke" | "set_value";
  readonly risk_tier: "read_only" | "reversible_write" | "destructive_irreversible";
  readonly expected_window_id: string;
  readonly target: UiControlTarget;
  readonly value?: string;
  readonly confirmed?: boolean;
}

export interface AccessibilityReadRequest {
  readonly task_id: string;
  readonly expected_window_id: string;
  readonly target: UiControlTarget;
}

export interface NativeAccessibilityState {
  readonly task_id: string;
  readonly window_id: string;
  readonly name: string;
  readonly automation_id: string;
  readonly control_type: string;
  readonly enabled: boolean;
  readonly offscreen: boolean;
  readonly value?: string;
}

export interface NativeUiActionResult {
  readonly action_id: string;
  readonly outcome: "completed" | "unverified";
  readonly verification: "accessibility_state";
  readonly detail: string;
  readonly resulting_value?: string;
  readonly accessibility_state?: NativeAccessibilityState;
}

export interface NativeDesktopAgentBridgeContract {
  captureScreenshot(request: ScreenshotRequest): Promise<NativeScreenshot>;
  readAccessibilityState(request: AccessibilityReadRequest): Promise<NativeAccessibilityState>;
  executeUiAction(request: UiActionRequest): Promise<NativeUiActionResult>;
}

export interface DesktopAgentControllerOptions {
  readonly permissions: DesktopPermissionReader;
  readonly focus: () => DesktopFocusState | null;
  readonly bridge: NativeDesktopAgentBridgeContract;
  readonly confirm?: (request: UiActionRequest) => Promise<boolean>;
}

export class DesktopAgentController {
  public constructor(private readonly options: DesktopAgentControllerOptions) {}

  public async captureScreenshot(
    request: Omit<ScreenshotRequest, "window_id">,
  ): Promise<Result<NativeScreenshot>> {
    if (!request.task_id) return err(this.invalid("A task-bound screenshot request is required."));
    if (!this.granted("screen"))
      return err(this.security("Screen capture permission is required."));
    const maxBytes = normalizeMaxBytes(request.max_bytes);
    if (maxBytes === undefined) {
      return err(this.invalid("Screenshot max_bytes must be between 1 KiB and 8 MiB."));
    }
    const focus = this.options.focus();
    const windowId =
      request.target === "focused-window" ? focus?.focused_window?.window_id : undefined;
    if (request.target === "focused-window" && !windowId) {
      return err(this.invalid("A focused window is required for focused-window capture."));
    }
    try {
      const screenshot = await this.options.bridge.captureScreenshot({
        ...request,
        max_bytes: maxBytes,
        ...(windowId === undefined ? {} : { window_id: windowId }),
      });
      if (
        screenshot.mime_type !== "image/png" ||
        !Number.isInteger(screenshot.width) ||
        screenshot.width <= 0 ||
        !Number.isInteger(screenshot.height) ||
        screenshot.height <= 0 ||
        !Number.isInteger(screenshot.byte_length) ||
        screenshot.byte_length < 1 ||
        screenshot.byte_length > maxBytes ||
        typeof screenshot.data_base64 !== "string" ||
        !/^[A-Za-z0-9+/]*={0,2}$/.test(screenshot.data_base64)
      ) {
        return err(this.invalid("Native screenshot output is malformed or exceeds its bound."));
      }
      let decodedLength = 0;
      try {
        decodedLength = Buffer.from(screenshot.data_base64, "base64").byteLength;
      } catch {
        return err(this.invalid("Native screenshot base64 payload is invalid."));
      }
      if (decodedLength !== screenshot.byte_length) {
        return err(this.invalid("Native screenshot byte length does not match its payload."));
      }
      return ok(screenshot);
    } catch (cause) {
      return err(this.nativeError(cause));
    }
  }

  public async readAccessibilityState(
    request: AccessibilityReadRequest,
  ): Promise<Result<NativeAccessibilityState>> {
    if (!request.task_id)
      return err(this.invalid("A task-bound accessibility request is required."));
    if (!this.granted("desktop_control")) {
      return err(this.security("Desktop control permission is required."));
    }
    const focusedWindow = this.options.focus()?.focused_window?.window_id;
    if (!focusedWindow || focusedWindow !== request.expected_window_id) {
      return err(
        this.invalid("The target window is no longer focused; accessibility read was paused."),
      );
    }
    if (!request.target.name && !request.target.automation_id) {
      return err(this.invalid("A structured UI target is required."));
    }
    try {
      const state = await this.options.bridge.readAccessibilityState(request);
      if (
        !this.validAccessibilityState(request, state) ||
        (state.name.length === 0 && state.automation_id.length === 0)
      ) {
        return err(this.invalid("Native accessibility state is malformed."));
      }
      return ok(state);
    } catch (cause) {
      return err(this.nativeError(cause));
    }
  }

  public async confirmDestructiveUiAction(request: UiActionRequest): Promise<boolean> {
    if (request.risk_tier !== "destructive_irreversible") return true;
    return (await this.options.confirm?.(request)) === true;
  }

  public async executeUiAction(request: UiActionRequest): Promise<Result<NativeUiActionResult>> {
    if (!request.task_id) return err(this.invalid("A task-bound UI action request is required."));
    if (!this.granted("desktop_control")) {
      return err(this.security("Desktop control permission is required."));
    }
    const focusedWindow = this.options.focus()?.focused_window?.window_id;
    if (!focusedWindow || focusedWindow !== request.expected_window_id) {
      return err(
        this.invalid(
          "The target window is no longer focused; UI action was paused for replanning.",
        ),
      );
    }
    if (request.action_id.length === 0 || request.expected_window_id.length === 0) {
      return err(this.invalid("UI action identifiers are required."));
    }
    if (request.action === "set_value" && request.value === undefined) {
      return err(this.invalid("set_value UI actions require a value."));
    }
    if (request.risk_tier === "destructive_irreversible" && request.confirmed !== true) {
      const confirmed = await this.confirmDestructiveUiAction(request);
      if (!confirmed) return err(this.security("Destructive UI action was not confirmed."));
    }
    try {
      const result = await this.options.bridge.executeUiAction(request);
      if (
        result.action_id !== request.action_id ||
        result.outcome !== "completed" ||
        result.verification !== "accessibility_state" ||
        result.accessibility_state === undefined ||
        !this.validAccessibilityState(request, result.accessibility_state) ||
        (request.action === "set_value" &&
          (result.resulting_value === undefined ||
            result.resulting_value !== result.accessibility_state.value))
      ) {
        return err(
          this.invalid("Native UI action lacks valid post-action accessibility evidence."),
        );
      }
      return ok(result);
    } catch (cause) {
      return err(this.nativeError(cause));
    }
  }

  public static nativePowerShellScript(): string {
    return String.raw`
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Runtime.InteropServices;
public static class NovaDesktopCapture {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hwnd, out RECT rect);
  [DllImport("user32.dll")] public static extern int GetSystemMetrics(int index);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }
  public static int[] Bounds(IntPtr hwnd, bool fullScreen) {
    if (fullScreen) {
      var left = GetSystemMetrics(76); var top = GetSystemMetrics(77);
      var right = GetSystemMetrics(78); var bottom = GetSystemMetrics(79);
      return new int[] { left, top, Math.Max(1, right - left), Math.Max(1, bottom - top) };
    }
    RECT rect;
    if (hwnd == IntPtr.Zero || !GetWindowRect(hwnd, out rect)) throw new InvalidOperationException("Window bounds unavailable.");
    return new int[] { rect.Left, rect.Top, Math.Max(1, rect.Right - rect.Left), Math.Max(1, rect.Bottom - rect.Top) };
  }
  public static byte[] Capture(int left, int top, int width, int height) {
    using (var bitmap = new Bitmap(width, height, PixelFormat.Format32bppArgb)) {
      using (var graphics = Graphics.FromImage(bitmap)) graphics.CopyFromScreen(left, top, 0, 0, new Size(width, height), CopyPixelOperation.SourceCopy);
      using (var stream = new MemoryStream()) { bitmap.Save(stream, ImageFormat.Png); return stream.ToArray(); }
    }
  }
}
'@
function Fail([string]$message) { @{ ok = $false; error = $message } | ConvertTo-Json -Compress; exit 1 }
function ControlTypeValue([string]$name) {
  switch ($name.ToLowerInvariant()) {
    'button' { return [System.Windows.Automation.ControlType]::Button }
    'edit' { return [System.Windows.Automation.ControlType]::Edit }
    'text' { return [System.Windows.Automation.ControlType]::Text }
    'checkbox' { return [System.Windows.Automation.ControlType]::CheckBox }
    'combobox' { return [System.Windows.Automation.ControlType]::ComboBox }
    'list' { return [System.Windows.Automation.ControlType]::List }
    'menuitem' { return [System.Windows.Automation.ControlType]::MenuItem }
    'tab' { return [System.Windows.Automation.ControlType]::Tab }
    default { Fail 'Unsupported control_type.' }
  }
}
function ReadElementState($element, [string]$taskId, [string]$windowId) {
  $current = $element.Current
  $value = $null
  try {
    $valuePattern = $element.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern)
    $value = ([System.Windows.Automation.ValuePattern]$valuePattern).Current.Value
  } catch { }
  return @{ task_id = $taskId; window_id = $windowId; name = [string]$current.Name; automation_id = [string]$current.AutomationId; control_type = [string]$current.ControlType.ProgrammaticName; enabled = [bool]$current.IsEnabled; offscreen = [bool]$current.IsOffscreen; value = $value }
}
function FindUiElement([IntPtr]$hwnd, $target) {
  $root = [System.Windows.Automation.AutomationElement]::FromHandle($hwnd)
  if ($null -eq $root) { Fail 'UI Automation root unavailable.' }
  $conditions = New-Object System.Collections.Generic.List[System.Windows.Automation.Condition]
  if ($target.automation_id) { $conditions.Add((New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::AutomationIdProperty, [string]$target.automation_id))) }
  if ($target.name) { $conditions.Add((New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::NameProperty, [string]$target.name))) }
  if ($target.control_type) { $conditions.Add((New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ControlTypeProperty, (ControlTypeValue([string]$target.control_type))))) }
  if ($conditions.Count -eq 0) { Fail 'A structured UI target is required.' }
  $condition = if ($conditions.Count -eq 1) { $conditions[0] } else { New-Object System.Windows.Automation.AndCondition($conditions.ToArray()) }
  $element = $root.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $condition)
  if ($null -eq $element) { Fail 'The requested UI control was not found.' }
  return $element
}
try {
  $request = [Console]::In.ReadToEnd() | ConvertFrom-Json
  if ($request.operation -eq 'capture') {
    $hwnd = [IntPtr]::Zero
    $fullScreen = $request.target -eq 'screen'
    if (-not $fullScreen) {
      if (-not $request.window_id -or $request.window_id -notmatch '^hwnd:[0-9A-Fa-f]+$') { Fail 'A valid focused window id is required.' }
      $hwnd = [IntPtr]([Convert]::ToInt64($request.window_id.Substring(6), 16))
    }
    $bounds = [NovaDesktopCapture]::Bounds($hwnd, $fullScreen)
    $bytes = [NovaDesktopCapture]::Capture($bounds[0], $bounds[1], $bounds[2], $bounds[3])
    if ($bytes.Length -gt [int]$request.max_bytes) { Fail 'Screenshot exceeds the requested byte bound.' }
    @{ ok = $true; value = @{ mime_type = 'image/png'; width = $bounds[2]; height = $bounds[3]; byte_length = $bytes.Length; data_base64 = [Convert]::ToBase64String($bytes); captured_at = [DateTime]::UtcNow.ToString('o') } } | ConvertTo-Json -Compress
    exit 0
  }
  if ($request.operation -eq 'read_ui') {
    if (-not $request.expected_window_id -or $request.expected_window_id -notmatch '^hwnd:[0-9A-Fa-f]+$') { Fail 'A valid target window id is required.' }
    $hwnd = [IntPtr]([Convert]::ToInt64($request.expected_window_id.Substring(6), 16))
    if ([NovaDesktopCapture]::GetForegroundWindow() -ne $hwnd) { Fail 'The target window is no longer focused.' }
    $element = FindUiElement $hwnd $request.target
    @{ ok = $true; value = (ReadElementState $element ([string]$request.task_id) ([string]$request.expected_window_id)) } | ConvertTo-Json -Compress
    exit 0
  }
  if ($request.operation -eq 'ui_action') {
    if (-not $request.expected_window_id -or $request.expected_window_id -notmatch '^hwnd:[0-9A-Fa-f]+$') { Fail 'A valid target window id is required.' }
    $hwnd = [IntPtr]([Convert]::ToInt64($request.expected_window_id.Substring(6), 16))
    if ([NovaDesktopCapture]::GetForegroundWindow() -ne $hwnd) { Fail 'The target window is no longer focused.' }
    $element = FindUiElement $hwnd $request.target
    if ($null -eq $element) { Fail 'The requested UI control was not found.' }
    if ($request.action -eq 'invoke') {
      $pattern = $element.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern)
      ([System.Windows.Automation.InvokePattern]$pattern).Invoke()
      $state = ReadElementState $element ([string]$request.task_id) ([string]$request.expected_window_id)
      @{ ok = $true; value = @{ action_id = [string]$request.action_id; outcome = 'completed'; verification = 'accessibility_state'; detail = 'UI Automation InvokePattern completed and state was read.'; accessibility_state = $state } } | ConvertTo-Json -Compress
      exit 0
    }
    if ($request.action -eq 'set_value') {
      $pattern = $element.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern)
      ([System.Windows.Automation.ValuePattern]$pattern).SetValue([string]$request.value)
      $state = ReadElementState $element ([string]$request.task_id) ([string]$request.expected_window_id)
      @{ ok = $true; value = @{ action_id = [string]$request.action_id; outcome = 'completed'; verification = 'accessibility_state'; detail = 'UI Automation ValuePattern completed and state was read.'; resulting_value = $state.value; accessibility_state = $state } } | ConvertTo-Json -Compress
      exit 0
    }
    Fail 'Unsupported UI action.'
  }
  Fail 'Unsupported native desktop operation.'
} catch { Fail $_.Exception.Message }
`;
  }

  private validAccessibilityState(
    request: { readonly task_id: string; readonly expected_window_id: string },
    state: NativeAccessibilityState,
  ): boolean {
    return (
      state.task_id === request.task_id &&
      state.window_id === request.expected_window_id &&
      typeof state.name === "string" &&
      typeof state.automation_id === "string" &&
      typeof state.control_type === "string" &&
      state.control_type.length > 0 &&
      typeof state.enabled === "boolean" &&
      typeof state.offscreen === "boolean"
    );
  }

  private granted(source: string): boolean {
    return this.options.permissions
      .list()
      .some((permission) => permission.source === source && permission.granted);
  }

  private security(message: string) {
    return { code: "NOVA-SEC001" as const, message, retryable: false };
  }

  private invalid(message: string) {
    return { code: "NOVA-TL002" as const, message, retryable: false };
  }

  private nativeError(cause: unknown) {
    return {
      code: "NOVA-EVT001" as const,
      message: cause instanceof Error ? cause.message : "Native desktop operation failed.",
      retryable: true,
    };
  }
}

export class NativeDesktopAgentBridge implements NativeDesktopAgentBridgeContract {
  public constructor(private readonly powershellPath = "powershell.exe") {}

  public async captureScreenshot(request: ScreenshotRequest): Promise<NativeScreenshot> {
    return await this.invoke({ operation: "capture", ...request });
  }

  public async readAccessibilityState(
    request: AccessibilityReadRequest,
  ): Promise<NativeAccessibilityState> {
    return await this.invoke({ operation: "read_ui", ...request });
  }

  public async executeUiAction(request: UiActionRequest): Promise<NativeUiActionResult> {
    return await this.invoke({ operation: "ui_action", ...request });
  }

  private async invoke<TValue>(request: Record<string, unknown>): Promise<TValue> {
    if (process.platform !== "win32") throw new Error("Native desktop control requires Windows.");
    const child = spawn(
      this.powershellPath,
      [
        "-NoLogo",
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        DesktopAgentController.nativePowerShellScript(),
      ],
      { windowsHide: true, shell: false, stdio: ["pipe", "pipe", "pipe"] },
    );
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });
    const exitCode = await new Promise<number>((resolve, reject) => {
      const timer = setTimeout(() => {
        child.kill();
        reject(new Error("Native desktop operation timed out."));
      }, 15_000);
      child.once("error", (error) => {
        clearTimeout(timer);
        reject(error);
      });
      child.once("close", (code) => {
        clearTimeout(timer);
        resolve(code ?? 1);
      });
      child.stdin.end(JSON.stringify(request));
    });
    const line = stdout.trim().split(/\r?\n/).filter(Boolean).at(-1);
    if (!line)
      throw new Error(stderr.trim() || `Native desktop operation exited with ${exitCode}.`);
    const parsed = JSON.parse(line) as {
      readonly ok?: boolean;
      readonly value?: TValue;
      readonly error?: string;
    };
    if (!parsed.ok || parsed.value === undefined)
      throw new Error((parsed.error ?? stderr.trim()) || "Native desktop operation failed.");
    return parsed.value;
  }
}

function normalizeMaxBytes(value: number | undefined): number | undefined {
  const result = value ?? 4 * 1024 * 1024;
  return Number.isInteger(result) && result >= 1024 && result <= 8 * 1024 * 1024
    ? result
    : undefined;
}

type RuntimeExecutionResult = Omit<ExecutionResult, "step_id">;
type RuntimeToolRegistration = ToolRegistration;

const screenshotExecution = async (
  getController: () => DesktopAgentController | undefined,
  parameters: Readonly<Record<string, unknown>>,
): Promise<RuntimeExecutionResult> => {
  const controller = getController();
  if (!controller) throw new Error("Desktop agent is not ready.");
  if (typeof parameters.task_id !== "string" || parameters.task_id.length === 0) {
    throw new Error("A task-bound screenshot request is required.");
  }
  const target = parameters.target;
  if (target !== "screen" && target !== "focused-window") {
    throw new Error("Screenshot target is invalid.");
  }
  const result = await controller.captureScreenshot({
    task_id: parameters.task_id,
    target,
    ...(typeof parameters.max_bytes === "number" ? { max_bytes: parameters.max_bytes } : {}),
  });
  if (!result.ok) throw new Error(result.error.message);
  return {
    status: "success",
    evidence: { type: "api_response", value: result.value },
    affected_resources: ["desktop.screen"],
  };
};

const accessibilityReadExecution = async (
  getController: () => DesktopAgentController | undefined,
  parameters: Readonly<Record<string, unknown>>,
): Promise<RuntimeExecutionResult> => {
  const controller = getController();
  if (!controller) throw new Error("Desktop agent is not ready.");
  if (
    typeof parameters.task_id !== "string" ||
    parameters.task_id.length === 0 ||
    typeof parameters.expected_window_id !== "string" ||
    typeof parameters.target !== "object" ||
    parameters.target === null
  ) {
    throw new Error("Accessibility read parameters are invalid.");
  }
  const result = await controller.readAccessibilityState({
    task_id: parameters.task_id,
    expected_window_id: parameters.expected_window_id,
    target: parameters.target as UiControlTarget,
  });
  if (!result.ok) throw new Error(result.error.message);
  return {
    status: "success",
    evidence: { type: "accessibility_state", value: result.value },
    affected_resources: ["desktop.focus", "desktop.accessibility"],
  };
};

const accessibilityExecution = async (
  getController: () => DesktopAgentController | undefined,
  parameters: Readonly<Record<string, unknown>>,
  riskTier: UiActionRequest["risk_tier"],
): Promise<RuntimeExecutionResult> => {
  const controller = getController();
  if (!controller) throw new Error("Desktop agent is not ready.");
  if (
    typeof parameters.task_id !== "string" ||
    parameters.task_id.length === 0 ||
    typeof parameters.action_id !== "string" ||
    (parameters.action !== "invoke" && parameters.action !== "set_value") ||
    typeof parameters.expected_window_id !== "string" ||
    typeof parameters.target !== "object" ||
    parameters.target === null
  ) {
    throw new Error("Desktop UI action parameters are invalid.");
  }
  const result = await controller.executeUiAction({
    task_id: parameters.task_id as string,
    action_id: parameters.action_id,
    action: parameters.action,
    risk_tier: riskTier,
    expected_window_id: parameters.expected_window_id,
    target: parameters.target as UiControlTarget,
    ...(typeof parameters.value === "string" ? { value: parameters.value } : {}),
    ...(parameters.confirmed === true ? { confirmed: true } : {}),
  });
  if (!result.ok) throw new Error(result.error.message);
  return {
    status: result.value.outcome === "completed" ? "success" : "partial",
    evidence: { type: "accessibility_state", value: result.value },
    affected_resources: ["desktop.focus"],
  };
};

export function createDesktopScreenCaptureTool(
  getController: () => DesktopAgentController | undefined,
): RuntimeToolRegistration {
  return {
    tool_id: "nova.screen-capture",
    deterministic: true,
    actions: {
      screenshot: {
        risk_tier: "read_only",
        verification_signal: "api_response",
        idempotent: true,
        execute: (parameters) => screenshotExecution(getController, parameters),
      },
    },
  };
}

export function createDesktopAccessibilityTool(
  getController: () => DesktopAgentController | undefined,
): RuntimeToolRegistration {
  const execute = (
    parameters: Readonly<Record<string, unknown>>,
    riskTier: UiActionRequest["risk_tier"],
  ) => accessibilityExecution(getController, parameters, riskTier);
  return {
    tool_id: "nova.desktop-accessibility",
    deterministic: true,
    actions: {
      read_state: {
        risk_tier: "read_only",
        verification_signal: "accessibility_state",
        idempotent: true,
        execute: (parameters) => accessibilityReadExecution(getController, parameters),
      },
      ui_action: {
        risk_tier: "reversible_write",
        verification_signal: "accessibility_state",
        idempotent: false,
        execute: (parameters) => execute(parameters, "reversible_write"),
      },
      ui_action_destructive: {
        risk_tier: "destructive_irreversible",
        verification_signal: "accessibility_state",
        idempotent: false,
        execute: (parameters) => execute(parameters, "destructive_irreversible"),
      },
    },
  };
}

export function createDesktopScreenCaptureDefinition(): RegisteredTool {
  return {
    tool_id: "nova.screen-capture",
    execution_tier: "vision",
    deterministic: true,
    dependencies: [],
    target_entity_types: ["screen", "focused-window"],
    supported_actions: [
      {
        action_id: "screenshot",
        risk_tier: "read_only",
        verification_signal: "api_response",
        lockable_resources: ["desktop.screen"],
        permission_scope: "screen",
        estimated_latency_ms: 500,
        estimated_cost_class: "free",
        timeout_ms: 15_000,
        idempotent: true,
        input_schema: {
          type: "object",
          properties: {
            target: { enum: ["screen", "focused-window"] },
            max_bytes: { type: "integer" },
          },
          required: ["target"],
          additionalProperties: false,
        },
        output_schema: {
          type: "object",
          properties: {
            mime_type: { const: "image/png" },
            width: { type: "integer", minimum: 1 },
            height: { type: "integer", minimum: 1 },
            byte_length: { type: "integer", minimum: 1024 },
            data_base64: { type: "string" },
            captured_at: { type: "string", format: "date-time" },
          },
          required: ["mime_type", "width", "height", "byte_length", "data_base64", "captured_at"],
          additionalProperties: false,
        },
      },
    ],
  };
}

export function createDesktopAccessibilityDefinition(): RegisteredTool {
  return {
    tool_id: "nova.desktop-accessibility",
    execution_tier: "accessibility",
    deterministic: true,
    dependencies: [],
    target_entity_types: ["focused-window", "accessibility-control"],
    supported_actions: [
      {
        action_id: "read_state",
        risk_tier: "read_only",
        verification_signal: "accessibility_state",
        lockable_resources: ["desktop.focus", "desktop.accessibility"],
        permission_scope: "desktop_control",
        estimated_latency_ms: 500,
        estimated_cost_class: "free",
        timeout_ms: 15_000,
        idempotent: true,
        input_schema: {
          type: "object",
          properties: {
            task_id: { type: "string", minLength: 1 },
            expected_window_id: { type: "string", minLength: 1 },
            target: { type: "object" },
          },
          required: ["task_id", "expected_window_id", "target"],
          additionalProperties: false,
        },
        output_schema: {
          type: "object",
          required: [
            "task_id",
            "window_id",
            "name",
            "automation_id",
            "control_type",
            "enabled",
            "offscreen",
          ],
        },
      },
      {
        action_id: "ui_action",
        risk_tier: "reversible_write",
        verification_signal: "accessibility_state",
        lockable_resources: ["desktop.focus", "desktop.accessibility"],
        permission_scope: "desktop_control",
        estimated_latency_ms: 1000,
        estimated_cost_class: "free",
        timeout_ms: 15_000,
        idempotent: false,
        input_schema: { type: "object" },
        output_schema: { type: "object", required: ["outcome", "verification"] },
      },
      {
        action_id: "ui_action_destructive",
        risk_tier: "destructive_irreversible",
        verification_signal: "accessibility_state",
        lockable_resources: ["desktop.focus", "desktop.accessibility"],
        permission_scope: "desktop_control",
        estimated_latency_ms: 1000,
        estimated_cost_class: "free",
        timeout_ms: 15_000,
        idempotent: false,
        input_schema: { type: "object" },
        output_schema: { type: "object", required: ["outcome", "verification"] },
      },
    ],
  };
}
