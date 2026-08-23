import { describe, expect, it } from "vitest";
import { ToolRegistry } from "@nova/runtime";
import {
  createDesktopAccessibilityDefinition,
  createDesktopScreenCaptureDefinition,
} from "../src/main/desktop-agent.js";

describe("desktop-agent tool registration", () => {
  it("registers screenshot capture with a separate vision-tier contract", () => {
    const tool = createDesktopScreenCaptureDefinition();
    const result = new ToolRegistry().register(tool);

    expect(result).toEqual({ ok: true, value: tool });
    expect(tool.execution_tier).toBe("vision");
    expect(tool.supported_actions[0]).toMatchObject({
      action_id: "screenshot",
      verification_signal: "api_response",
      permission_scope: "screen",
      lockable_resources: ["desktop.screen"],
      timeout_ms: 15_000,
      idempotent: true,
    });
  });

  it("registers UI Automation separately with accessibility evidence", () => {
    const tool = createDesktopAccessibilityDefinition();
    const result = new ToolRegistry().register(tool);

    expect(result).toEqual({ ok: true, value: tool });
    expect(tool.execution_tier).toBe("accessibility");
    expect(tool.supported_actions).toHaveLength(3);
    expect(tool.supported_actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action_id: "read_state",
          risk_tier: "read_only",
          verification_signal: "accessibility_state",
          permission_scope: "desktop_control",
          lockable_resources: ["desktop.focus", "desktop.accessibility"],
          idempotent: true,
        }),
        expect.objectContaining({
          action_id: "ui_action",
          risk_tier: "reversible_write",
          verification_signal: "accessibility_state",
          permission_scope: "desktop_control",
          lockable_resources: ["desktop.focus", "desktop.accessibility"],
          idempotent: false,
        }),
        expect.objectContaining({
          action_id: "ui_action_destructive",
          risk_tier: "destructive_irreversible",
          verification_signal: "accessibility_state",
          permission_scope: "desktop_control",
          idempotent: false,
        }),
      ]),
    );
  });
});
