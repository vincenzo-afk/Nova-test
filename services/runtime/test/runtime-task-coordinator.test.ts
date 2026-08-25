import { describe, expect, it, vi } from "vitest";
import { InMemoryCommunicationBus } from "@nova/shared";
import {
  Executor,
  PermissionManager,
  Planner,
  Verifier,
  type ToolRegistration,
} from "../src/orchestration.js";
import { TaskManager } from "../src/task-manager.js";
import { RuntimeTaskCoordinator } from "../src/runtime-task-coordinator.js";

const step = {
  step_id: "step-1",
  task_id: "placeholder",
  correlation_id: "00000000-0000-4000-8000-000000000001",
  capability_id: "capability.test",
  resolved_tool_id: "tool.test",
  action_id: "run",
  parameters: { value: 42 },
  risk_tier: "read_only" as const,
  execution_tier: "internal_function" as const,
  required_locks: [],
  timeout_ms: 1_000,
  confirmation_status: "not_required" as const,
};

const tool: ToolRegistration = {
  tool_id: "tool.test",
  deterministic: true,
  actions: {
    run: {
      risk_tier: "read_only",
      verification_signal: "api_response",
      idempotent: true,
      execute: vi.fn(async (parameters) => ({
        status: "success" as const,
        evidence: { type: "api_response" as const, value: parameters.value },
        affected_resources: [],
      })),
    },
  },
};

describe("RuntimeTaskCoordinator", () => {
  it("persists task checkpoints before returning and after lifecycle mutations", async () => {
    const checkpoints: Array<{ state: string; status: string }> = [];
    const persistence = {
      append: async (record: { state: string }, status: string) => {
        checkpoints.push({ state: record.state, status });
        return { ok: true as const, value: undefined };
      },
    };
    const tasks = new TaskManager();
    const coordinator = new RuntimeTaskCoordinator({
      tasks,
      planner: new Planner({ deterministic: new Map() }),
      executor: new Executor(
        new PermissionManager({ allowedToolIds: new Set(), confirmationTimeoutMs: 30_000 }),
        new Map(),
      ),
      verifier: new Verifier(),
      events: new InMemoryCommunicationBus(),
      persistence,
    });

    const submitted = await coordinator.submitDurable({ goal: "durable task" });

    expect(submitted).toMatchObject({ ok: true, value: { state: "Created" } });
    expect(checkpoints).toEqual([{ state: "Created", status: "Created" }]);
  });

  it("executes a deterministic task through planning, permission, execution, and verification", async () => {
    const bus = new InMemoryCommunicationBus();
    const events: unknown[] = [];
    bus.subscribe("task.progress", async (message) => {
      events.push(message);
    });
    const tasks = new TaskManager();
    const coordinator = new RuntimeTaskCoordinator({
      tasks,
      planner: new Planner({ deterministic: new Map([["run test", step]]) }),
      executor: new Executor(
        new PermissionManager({
          allowedToolIds: new Set([tool.tool_id]),
          confirmationTimeoutMs: 30_000,
        }),
        new Map([[tool.tool_id, tool]]),
      ),
      verifier: new Verifier(),
      events: bus,
    });

    const submitted = coordinator.submit({ goal: "run test", correlation_id: step.correlation_id });
    expect(submitted.ok).toBe(true);
    if (!submitted.ok) return;

    const completed = await coordinator.execute(submitted.value.task_id);

    expect(completed).toMatchObject({
      ok: true,
      value: { state: "Completed", step_history: [{ verdict: { outcome: "verified" } }] },
    });
    expect(tool.actions.run.execute).toHaveBeenCalledWith({ value: 42 });
    expect(events.map((event) => (event as { payload: { state: string } }).payload.state)).toEqual([
      "Created",
      "Planning",
      "Executing",
      "Verifying",
      "Completed",
    ]);
  });

  it("fails safely when the permission boundary denies the planned tool", async () => {
    const tasks = new TaskManager();
    const deniedExecute = vi.fn(tool.actions.run.execute);
    const deniedTool: ToolRegistration = {
      ...tool,
      actions: { run: { ...tool.actions.run, execute: deniedExecute } },
    };
    const coordinator = new RuntimeTaskCoordinator({
      tasks,
      planner: new Planner({ deterministic: new Map([["denied", step]]) }),
      executor: new Executor(
        new PermissionManager({ allowedToolIds: new Set(), confirmationTimeoutMs: 30_000 }),
        new Map([[deniedTool.tool_id, deniedTool]]),
      ),
      verifier: new Verifier(),
      events: new InMemoryCommunicationBus(),
    });

    const submitted = coordinator.submit({ goal: "denied" });
    if (!submitted.ok) throw new Error("Task submission failed.");
    const result = await coordinator.execute(submitted.value.task_id);

    expect(result).toMatchObject({ ok: true, value: { state: "Failed" } });
    expect(deniedExecute).not.toHaveBeenCalled();
  });

  it("requires explicit confirmation before retrying and then reuses the authoritative execution path", async () => {
    const tasks = new TaskManager();
    const coordinator = new RuntimeTaskCoordinator({
      tasks,
      planner: new Planner({ deterministic: new Map([["retry me", step]]) }),
      executor: new Executor(
        new PermissionManager({
          allowedToolIds: new Set([tool.tool_id]),
          confirmationTimeoutMs: 30_000,
        }),
        new Map([[tool.tool_id, tool]]),
      ),
      verifier: new Verifier(),
      events: new InMemoryCommunicationBus(),
    });
    const submitted = tasks.create({ goal: "retry me" });
    if (!submitted.ok) throw new Error("Task creation failed.");
    expect(tasks.transition(submitted.value.task_id, "Planning")).toMatchObject({ ok: true });
    expect(tasks.transition(submitted.value.task_id, "Failed", "retryable failure")).toMatchObject({
      ok: true,
    });

    expect(await coordinator.retry(submitted.value.task_id, false)).toMatchObject({
      ok: false,
      error: { code: "NOVA-SEC001" },
    });
    const retried = await coordinator.retry(submitted.value.task_id, true);

    expect(retried).toMatchObject({
      ok: true,
      value: { state: "Completed", retry_count: 1 },
    });
  });

  it("requires explicit confirmation before resuming a paused task", async () => {
    const tasks = new TaskManager();
    const coordinator = new RuntimeTaskCoordinator({
      tasks,
      planner: new Planner({ deterministic: new Map([["resume me", step]]) }),
      executor: new Executor(
        new PermissionManager({
          allowedToolIds: new Set([tool.tool_id]),
          confirmationTimeoutMs: 30_000,
        }),
        new Map([[tool.tool_id, tool]]),
      ),
      verifier: new Verifier(),
      events: new InMemoryCommunicationBus(),
    });
    const submitted = tasks.create({ goal: "resume me" });
    if (!submitted.ok) throw new Error("Task creation failed.");
    expect(tasks.transition(submitted.value.task_id, "Paused")).toMatchObject({ ok: true });

    expect(await coordinator.resumePaused(submitted.value.task_id, false)).toMatchObject({
      ok: false,
      error: { code: "NOVA-SEC001" },
    });
    const resumed = await coordinator.resumePaused(submitted.value.task_id, true);

    expect(resumed).toMatchObject({ ok: true, value: { state: "Completed", retry_count: 0 } });
  });

  it("never reports Completed when execution has no verification evidence", async () => {
    const tasks = new TaskManager();
    const coordinator = new RuntimeTaskCoordinator({
      tasks,
      planner: new Planner({ deterministic: new Map([["unverified", step]]) }),
      executor: new Executor(
        new PermissionManager({
          allowedToolIds: new Set([tool.tool_id]),
          confirmationTimeoutMs: 30_000,
        }),
        new Map([
          [
            tool.tool_id,
            {
              ...tool,
              actions: {
                run: {
                  ...tool.actions.run,
                  execute: async () => ({
                    status: "success" as const,
                    evidence: { type: "none" as const, value: null },
                    affected_resources: [],
                  }),
                },
              },
            },
          ],
        ]),
      ),
      verifier: new Verifier(),
      events: new InMemoryCommunicationBus(),
    });

    const submitted = coordinator.submit({ goal: "unverified" });
    if (!submitted.ok) throw new Error("Task submission failed.");
    const result = await coordinator.execute(submitted.value.task_id);

    expect(result).toMatchObject({ ok: true, value: { state: "Unverified" } });
  });
});
