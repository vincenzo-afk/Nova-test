import { describe, expect, it, vi } from "vitest";
import { TaskManager } from "@nova/runtime";
import { cancelDesktopTask, listDesktopTasks } from "../src/main/task-controls.js";

describe("desktop task controls", () => {
  it("returns bounded opaque-cursor pages from the authoritative task list", () => {
    const tasks = new TaskManager();
    const first = tasks.create({ goal: "first" });
    const second = tasks.create({ goal: "second" });
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);

    const page = listDesktopTasks(tasks.list(), { limit: 1 });
    expect(page).toMatchObject({
      ok: true,
      value: { items: [first.ok ? first.value : undefined], has_more: true },
    });
    if (!page.ok) return;
    const next = listDesktopTasks(tasks.list(), {
      limit: 1,
      cursor: page.value.next_cursor ?? undefined,
    });
    expect(next).toMatchObject({
      ok: true,
      value: { items: [second.ok ? second.value : undefined], has_more: false, next_cursor: null },
    });
  });

  it("cancels a queued task and refuses to pretend a running task was interrupted", () => {
    const tasks = new TaskManager();
    const created = tasks.create({ goal: "queued" });
    const running = tasks.create({ goal: "running" });
    expect(created.ok && running.ok).toBe(true);
    if (!created.ok || !running.ok) return;
    expect(tasks.transition(running.value.task_id, "Planning").ok).toBe(true);
    expect(tasks.transition(running.value.task_id, "Executing").ok).toBe(true);
    const scheduler = { cancel: vi.fn(() => true) };

    const unconfirmed = cancelDesktopTask(tasks, scheduler, created.value.task_id, false);
    expect(unconfirmed).toMatchObject({ ok: false, error: { code: "NOVA-SEC001" } });
    expect(scheduler.cancel).not.toHaveBeenCalled();

    const cancelled = cancelDesktopTask(tasks, scheduler, created.value.task_id, true);
    expect(cancelled).toMatchObject({ ok: true, value: { state: "Cancelled" } });
    expect(scheduler.cancel).toHaveBeenCalledWith(created.value.task_id);

    const refused = cancelDesktopTask(tasks, scheduler, running.value.task_id, true);
    expect(refused).toMatchObject({ ok: false, error: { code: "NOVA-TL003" } });
  });

  it("rejects malformed task cursors", () => {
    const result = listDesktopTasks([], { limit: 50, cursor: "bad-cursor" });
    expect(result).toMatchObject({ ok: false, error: { code: "NOVA-TL003" } });
  });
});
