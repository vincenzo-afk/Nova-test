import { describe, expect, it, vi } from "vitest";
import {
  DesktopAgentController,
  type DesktopFocusState,
  type NativeDesktopAgentBridgeContract,
  type NativeScreenshot,
  type NativeUiActionResult,
  type UiActionRequest,
} from "../src/main/desktop-agent.js";

const focus = (windowId = "hwnd:2A"): DesktopFocusState => ({
  active_application: { application_name: "Editor", process_id: 42 },
  focused_window: {
    window_id: windowId,
    process_id: 42,
    application_name: "Editor",
    title: "Notes",
    monitor_id: "DISPLAY1",
    virtual_desktop_id: "desktop-1",
    z_order: 0,
  },
  updated_at: "2026-08-23T00:00:00.000Z",
  confidence: 1,
  correlation_id: "00000000-0000-4000-8000-000000000001",
});

const screenshot: NativeScreenshot = {
  mime_type: "image/png",
  width: 800,
  height: 600,
  byte_length: 10,
  data_base64: "c2NyZWVuc2hvdA==",
  captured_at: "2026-08-23T00:00:00.000Z",
};

const bridge = (overrides: Partial<NativeDesktopAgentBridgeContract> = {}) =>
  ({
    captureScreenshot: vi.fn(async () => screenshot),
    readAccessibilityState: vi.fn(async () => ({
      task_id: "task-1",
      window_id: "hwnd:2A",
      name: "Save",
      automation_id: "saveButton",
      control_type: "button",
      enabled: true,
      offscreen: false,
    })),
    executeUiAction: vi.fn(async (request: UiActionRequest): Promise<NativeUiActionResult> => ({
      action_id: request.action_id,
      outcome: "completed",
      verification: "accessibility_state",
      detail: "Invoked control.",
      accessibility_state: {
        task_id: "task-1",
        window_id: "hwnd:2A",
        name: "Save",
        automation_id: "saveButton",
        control_type: "button",
        enabled: true,
        offscreen: false,
      },
    })),
    ...overrides,
  }) satisfies NativeDesktopAgentBridgeContract;

const permissions = (screen = true, desktopControl = true) => ({
  list: () => [
    { source: "screen", granted: screen },
    { source: "desktop_control", granted: desktopControl },
  ],
});

describe("DesktopAgentController", () => {
  it("reads structured accessibility state only with desktop-control permission", async () => {
    const native = bridge({
      readAccessibilityState: vi.fn(async () => ({
        task_id: "task-1",
        window_id: "hwnd:2A",
        name: "Save",
        automation_id: "saveButton",
        control_type: "button",
        enabled: true,
        offscreen: false,
        value: undefined,
      })),
    });
    const controller = new DesktopAgentController({
      permissions: permissions(false, true),
      focus: () => focus(),
      bridge: native,
    });

    const result = await controller.readAccessibilityState({
      task_id: "task-1",
      expected_window_id: "hwnd:2A",
      target: { name: "Save", automation_id: "saveButton", control_type: "button" },
    });

    expect(result).toMatchObject({
      ok: true,
      value: { task_id: "task-1", window_id: "hwnd:2A", control_type: "button", enabled: true },
    });
    expect(native.readAccessibilityState).toHaveBeenCalledWith({
      task_id: "task-1",
      expected_window_id: "hwnd:2A",
      target: { name: "Save", automation_id: "saveButton", control_type: "button" },
    });
  });

  it("pauses accessibility reads when focus changes and rejects revoked control permission", async () => {
    const native = bridge({ readAccessibilityState: vi.fn(async () => ({}) as never) });
    const focusMismatch = new DesktopAgentController({
      permissions: permissions(false, true),
      focus: () => focus("hwnd:99"),
      bridge: native,
    });
    const mismatch = await focusMismatch.readAccessibilityState({
      task_id: "task-1",
      expected_window_id: "hwnd:2A",
      target: { name: "Save" },
    });
    expect(mismatch).toMatchObject({ ok: false, error: { code: "NOVA-TL002" } });
    expect(native.readAccessibilityState).not.toHaveBeenCalled();

    const revoked = new DesktopAgentController({
      permissions: permissions(false, false),
      focus: () => focus(),
      bridge: native,
    });
    const denied = await revoked.readAccessibilityState({
      task_id: "task-1",
      expected_window_id: "hwnd:2A",
      target: { name: "Save" },
    });
    expect(denied).toMatchObject({ ok: false, error: { code: "NOVA-SEC001" } });
  });

  it("captures a bounded screenshot only with explicit screen permission", async () => {
    const native = bridge();
    const controller = new DesktopAgentController({
      permissions: permissions(true, false),
      focus: () => focus(),
      bridge: native,
    });

    const result = await controller.captureScreenshot({
      task_id: "task-1",
      target: "focused-window",
      max_bytes: 2_000_000,
    });

    expect(result).toEqual({ ok: true, value: screenshot });
    expect(native.captureScreenshot).toHaveBeenCalledWith({
      task_id: "task-1",
      target: "focused-window",
      window_id: "hwnd:2A",
      max_bytes: 2_000_000,
    });
  });

  it("refuses capture when screen permission is revoked and never calls native capture", async () => {
    const native = bridge();
    const controller = new DesktopAgentController({
      permissions: permissions(false, false),
      focus: () => focus(),
      bridge: native,
    });

    const result = await controller.captureScreenshot({ task_id: "task-1", target: "screen" });

    expect(result).toMatchObject({ ok: false, error: { code: "NOVA-SEC001" } });
    expect(native.captureScreenshot).not.toHaveBeenCalled();
  });

  it("requires a current focused window and confirmation for destructive UI actions", async () => {
    const native = bridge();
    const confirm = vi.fn(async () => true);
    const controller = new DesktopAgentController({
      permissions: permissions(true, true),
      focus: () => focus(),
      bridge: native,
      confirm,
    });

    const result = await controller.executeUiAction({
      task_id: "task-1",
      action_id: "delete-note",
      action: "invoke",
      risk_tier: "destructive_irreversible",
      expected_window_id: "hwnd:2A",
      target: { automation_id: "deleteButton", control_type: "button" },
    });

    expect(result).toMatchObject({ ok: true, value: { outcome: "completed" } });
    expect(confirm).toHaveBeenCalledOnce();
    expect(native.executeUiAction).toHaveBeenCalledWith({
      task_id: "task-1",
      action_id: "delete-note",
      action: "invoke",
      risk_tier: "destructive_irreversible",
      expected_window_id: "hwnd:2A",
      target: { automation_id: "deleteButton", control_type: "button" },
    });
  });

  it("pauses instead of injecting into a changed focus window", async () => {
    const native = bridge();
    const controller = new DesktopAgentController({
      permissions: permissions(true, true),
      focus: () => focus("hwnd:99"),
      bridge: native,
    });

    const result = await controller.executeUiAction({
      task_id: "task-1",
      action_id: "save-note",
      action: "invoke",
      risk_tier: "reversible_write",
      expected_window_id: "hwnd:2A",
      target: { name: "Save", control_type: "button" },
    });

    expect(result).toMatchObject({ ok: false, error: { code: "NOVA-TL002" } });
    expect(native.executeUiAction).not.toHaveBeenCalled();
  });

  it("rejects malformed screenshot payloads and byte mismatches", async () => {
    const native = bridge({
      captureScreenshot: vi.fn(async () => ({ ...screenshot, byte_length: 11 })),
    });
    const controller = new DesktopAgentController({
      permissions: permissions(true, false),
      focus: () => focus(),
      bridge: native,
    });

    const result = await controller.captureScreenshot({ task_id: "task-1", target: "screen" });

    expect(result).toMatchObject({ ok: false, error: { code: "NOVA-TL002" } });
  });

  it("rejects native capture failures and oversized frames", async () => {
    const failedNative = bridge({
      captureScreenshot: vi.fn(async () => {
        throw new Error("capture failed");
      }),
    });
    const failedController = new DesktopAgentController({
      permissions: permissions(true, false),
      focus: () => focus(),
      bridge: failedNative,
    });
    const failed = await failedController.captureScreenshot({
      task_id: "task-1",
      target: "screen",
    });
    expect(failed).toMatchObject({ ok: false, error: { code: "NOVA-EVT001" } });

    const oversizedNative = bridge({
      captureScreenshot: vi.fn(async () => ({ ...screenshot, byte_length: 2_000_001 })),
    });
    const oversizedController = new DesktopAgentController({
      permissions: permissions(true, false),
      focus: () => focus(),
      bridge: oversizedNative,
    });
    const oversized = await oversizedController.captureScreenshot({
      task_id: "task-1",
      target: "screen",
      max_bytes: 2_000_000,
    });
    expect(oversized).toMatchObject({ ok: false, error: { code: "NOVA-TL002" } });
  });

  it("requires a task identifier before capture or control", async () => {
    const native = bridge();
    const controller = new DesktopAgentController({
      permissions: permissions(true, true),
      focus: () => focus(),
      bridge: native,
    });

    const result = await controller.captureScreenshot({ task_id: "", target: "screen" });

    expect(result).toMatchObject({ ok: false, error: { code: "NOVA-TL002" } });
    expect(native.captureScreenshot).not.toHaveBeenCalled();
  });

  it("rejects an unconfirmed destructive action and exposes native implementation metadata", async () => {
    const native = bridge();
    const controller = new DesktopAgentController({
      permissions: permissions(true, true),
      focus: () => focus(),
      bridge: native,
      confirm: async () => false,
    });

    const result = await controller.executeUiAction({
      task_id: "task-1",
      action_id: "delete-note",
      action: "invoke",
      risk_tier: "destructive_irreversible",
      expected_window_id: "hwnd:2A",
      target: { name: "Delete", control_type: "button" },
    });

    expect(result).toMatchObject({ ok: false, error: { code: "NOVA-SEC001" } });
    expect(native.executeUiAction).not.toHaveBeenCalled();
    expect(DesktopAgentController.nativePowerShellScript()).toContain("AutomationElement");
    expect(DesktopAgentController.nativePowerShellScript()).toContain("CopyFromScreen");
    expect(DesktopAgentController.nativePowerShellScript()).toContain("read_ui");
    expect(DesktopAgentController.nativePowerShellScript()).toContain("ControlTypeProperty");
  });
});
