import { describe, expect, it, vi } from "vitest";
import {
  Executor,
  PermissionManager,
  Planner,
  Verifier,
  type ExecutionStep,
  type ToolRegistration,
} from "../src/orchestration.js";

const step = (overrides: Partial<ExecutionStep> = {}): ExecutionStep => ({
  step_id: "step-1",
  task_id: "task-1",
  correlation_id: "00000000-0000-4000-8000-000000000001",
  capability_id: "filesystem.read",
  resolved_tool_id: "filesystem",
  action_id: "read",
  parameters: { path: "README.md" },
  risk_tier: "read_only",
  execution_tier: "native_runtime",
  required_locks: [],
  timeout_ms: 500,
  confirmation_status: "not_required",
  ...overrides,
});

describe("Nova execution pipeline integration", () => {
  it("plans, authorizes, executes, and verifies a deterministic read operation", async () => {
    const planned = step();
    const planner = new Planner({ deterministic: new Map([["read README", planned]]) });
    const execute = vi.fn(async () => ({
      status: "success" as const,
      evidence: { type: "file_hash" as const, value: "hash" },
      affected_resources: ["README.md"],
    }));
    const tool: ToolRegistration = {
      tool_id: "filesystem",
      deterministic: true,
      actions: {
        read: {
          risk_tier: "read_only",
          verification_signal: "file_hash",
          idempotent: true,
          execute,
        },
      },
    };
    const executor = new Executor(
      new PermissionManager({
        allowedToolIds: new Set(["filesystem"]),
        confirmationTimeoutMs: 1_000,
      }),
      new Map([[tool.tool_id, tool]]),
    );

    const plan = await planner.plan({ task_id: "task-1", goal: "read README" });
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    const plannedStep = plan.value[0];
    expect(plannedStep).toBeDefined();
    if (!plannedStep) return;
    const execution = await executor.execute(plannedStep);
    expect(execution).toMatchObject({ ok: true, value: { status: "success" } });
    if (!execution.ok) return;
    const verdict = new Verifier().verify(plannedStep, execution.value);

    expect(verdict).toMatchObject({ ok: true, value: { outcome: "verified" } });
    expect(execute).toHaveBeenCalledOnce();
  });

  it("blocks an unapproved destructive action before the tool mutates state", async () => {
    const execute = vi.fn(async () => ({
      status: "success" as const,
      evidence: { type: "exit_code" as const, value: 0 },
      affected_resources: [],
    }));
    const tool: ToolRegistration = {
      tool_id: "filesystem",
      deterministic: true,
      actions: {
        delete: {
          risk_tier: "destructive_irreversible",
          verification_signal: "exit_code",
          idempotent: false,
          execute,
        },
      },
    };
    const executor = new Executor(
      new PermissionManager({
        allowedToolIds: new Set(["filesystem"]),
        confirmationTimeoutMs: 1_000,
      }),
      new Map([[tool.tool_id, tool]]),
    );

    const result = await executor.execute(
      step({ action_id: "delete", risk_tier: "destructive_irreversible" }),
    );

    expect(result).toMatchObject({ ok: false, error: { code: "NOVA-SEC001" } });
    expect(execute).not.toHaveBeenCalled();
  });

  it("surfaces an idempotent tool failure as retryable pipeline evidence", async () => {
    const tool: ToolRegistration = {
      tool_id: "filesystem",
      deterministic: true,
      actions: {
        read: {
          risk_tier: "read_only",
          verification_signal: "file_hash",
          idempotent: true,
          execute: vi.fn(async () => {
            throw new Error("temporary I/O failure");
          }),
        },
      },
    };
    const executor = new Executor(
      new PermissionManager({
        allowedToolIds: new Set(["filesystem"]),
        confirmationTimeoutMs: 1_000,
      }),
      new Map([[tool.tool_id, tool]]),
    );

    const result = await executor.execute(step());

    expect(result).toMatchObject({ ok: false, error: { code: "NOVA-TL002", retryable: true } });
  });
});
