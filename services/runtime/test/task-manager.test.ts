import { describe, expect, it } from "vitest";
import { TaskManager } from "../src/task-manager.js";

describe("TaskManager", () => {
  it("persists the complete happy-path lifecycle to Completed", () => {
    const manager = new TaskManager();
    manager.create({ task_id: "task-1", goal: "read report", correlation_id: "corr-1" });

    expect(manager.transition("task-1", "Planning")).toMatchObject({ ok: true });
    expect(manager.transition("task-1", "Executing")).toMatchObject({ ok: true });
    expect(manager.transition("task-1", "Verifying")).toMatchObject({ ok: true });
    expect(manager.transition("task-1", "Completed")).toMatchObject({ ok: true });
    expect(manager.get("task-1")).toMatchObject({
      ok: true,
      value: { state: "Completed", retry_count: 0 },
    });
  });

  it("keeps Unverified and Failed distinct and routes both through bounded Retrying", () => {
    const manager = new TaskManager({ maxRetries: 1 });
    manager.create({ task_id: "task-1", goal: "run", correlation_id: "corr-1" });
    manager.transition("task-1", "Planning");
    manager.transition("task-1", "Executing");
    manager.transition("task-1", "Verifying");
    manager.transition("task-1", "Unverified");

    expect(manager.transition("task-1", "Retrying")).toMatchObject({ ok: true });
    expect(manager.get("task-1")).toMatchObject({
      ok: true,
      value: { state: "Retrying", retry_count: 1 },
    });
    expect(manager.transition("task-1", "Planning")).toMatchObject({ ok: true });
    expect(manager.transition("task-1", "Failed")).toMatchObject({ ok: true });
    expect(manager.transition("task-1", "Retrying")).toMatchObject({
      ok: false,
      error: { code: "NOVA-TL002" },
    });
  });

  it("stores the reason for permission confirmation separately from clarification", () => {
    const manager = new TaskManager();
    manager.create({ task_id: "task-1", goal: "delete file", correlation_id: "corr-1" });
    manager.transition("task-1", "Paused");
    manager.transition("task-1", "WaitingUser", "permission_confirmation");

    expect(manager.get("task-1")).toMatchObject({
      ok: true,
      value: { waiting_user_reason: "permission_confirmation" },
    });

    manager.create({ task_id: "task-2", goal: "choose file", correlation_id: "corr-2" });
    manager.transition("task-2", "Planning");
    manager.transition("task-2", "WaitingUser", "clarification_requested");

    expect(manager.get("task-2")).toMatchObject({
      ok: true,
      value: { waiting_user_reason: "clarification_requested" },
    });
  });

  it("supports pause/resume without discarding the current step and rejects illegal transitions", () => {
    const manager = new TaskManager();
    manager.create({ task_id: "task-1", goal: "open app", correlation_id: "corr-1" });
    manager.transition("task-1", "Planning");
    manager.transition("task-1", "Paused");

    expect(manager.transition("task-1", "Executing", "resumed")).toMatchObject({ ok: true });
    expect(manager.transition("task-1", "Completed")).toMatchObject({
      ok: false,
      error: { code: "NOVA-TL002" },
    });
    expect(manager.transition("unknown", "Planning")).toMatchObject({
      ok: false,
      error: { code: "NOVA-TL004" },
    });
  });
});
