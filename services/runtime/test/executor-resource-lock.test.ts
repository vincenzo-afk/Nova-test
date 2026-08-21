import { describe, expect, it, vi } from "vitest";
import { Executor, PermissionManager } from "../src/orchestration.js";
import { ResourceManager } from "../src/resource-manager.js";

describe("Executor resource-lock integration", () => {
  it("releases acquired locks when a write action fails", async () => {
    const resources = new ResourceManager();
    const tool = {
      tool_id: "tool.writer",
      deterministic: true,
      actions: {
        write: {
          risk_tier: "reversible_write" as const,
          verification_signal: "file_hash" as const,
          idempotent: true,
          execute: vi.fn(async () => {
            throw new Error("write failed");
          }),
        },
      },
    };
    const executor = new Executor(
      new PermissionManager({
        allowedToolIds: new Set(["tool.writer"]),
        confirmationTimeoutMs: 300_000,
      }),
      new Map([[tool.tool_id, tool]]),
      resources,
    );

    const result = await executor.execute({
      step_id: "step-lock-1",
      task_id: "task-lock-1",
      correlation_id: "00000000-0000-4000-8000-000000000001",
      capability_id: "capability.filesystem",
      resolved_tool_id: "tool.writer",
      action_id: "write",
      parameters: {},
      risk_tier: "reversible_write",
      execution_tier: "native_runtime",
      required_locks: ["file:/workspace/report.txt"],
      timeout_ms: 5_000,
      confirmation_status: "approved",
    });

    expect(result).toMatchObject({ ok: false, error: { code: "NOVA-TL002" } });
    expect(resources.holder("file:/workspace/report.txt")).toBeUndefined();
  });
});
