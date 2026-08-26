import { describe, expect, it, vi } from "vitest";
import { ok } from "@nova/shared";
import type { TaskRecord } from "@nova/runtime";
import { submitDesktopTask } from "../src/main/task-submission.js";

describe("desktop task submission", () => {
  it("durably submits and dispatches a task through the local scheduler", async () => {
    const task: TaskRecord = {
      task_id: "task-1",
      goal: "open the project",
      correlation_id: "00000000-0000-4000-8000-000000000001",
      state: "Created",
      retry_count: 0,
      step_history: [],
      updated_at: "2026-08-26T00:00:00.000Z",
    };
    const coordinator = {
      submitDurable: vi.fn(async () => ok(task)),
    };
    const scheduler = {
      enqueue: vi.fn(),
      dispatch: vi.fn(async () => undefined),
    };

    const result = await submitDesktopTask(coordinator, scheduler, task.goal);

    expect(result).toEqual(ok(task));
    expect(coordinator.submitDurable).toHaveBeenCalledWith({ goal: task.goal });
    expect(scheduler.enqueue).toHaveBeenCalledWith(task.task_id, "interactive");
    expect(scheduler.dispatch).toHaveBeenCalledOnce();
  });

  it("does not enqueue or dispatch when durable submission fails", async () => {
    const error = {
      code: "NOVA-MEM003" as const,
      message: "persistence failed",
      retryable: true,
    };
    const coordinator = {
      submitDurable: vi.fn(async () => ({ ok: false as const, error })),
    };
    const scheduler = {
      enqueue: vi.fn(),
      dispatch: vi.fn(async () => undefined),
    };

    const result = await submitDesktopTask(coordinator, scheduler, "open the project");

    expect(result).toEqual({ ok: false, error });
    expect(scheduler.enqueue).not.toHaveBeenCalled();
    expect(scheduler.dispatch).not.toHaveBeenCalled();
  });
});
