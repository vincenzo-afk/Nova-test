import { describe, expect, it } from "vitest";
import { ResourceManager } from "../src/resource-manager.js";

describe("ResourceManager", () => {
  it("acquires a batch atomically and grants queued work after release", () => {
    const manager = new ResourceManager();

    expect(manager.acquire("task-a", ["file:b", "file:a"])).toMatchObject({
      ok: true,
      value: { status: "granted" },
    });
    const queued = manager.acquire("task-b", ["file:a", "file:c"]);

    expect(queued).toMatchObject({ ok: true, value: { status: "queued" } });
    expect(manager.holder("file:c")).toBeUndefined();
    expect(manager.release("task-a")).toMatchObject({ ok: true, value: ["task-b"] });
    expect(manager.holder("file:a")).toBe("task-b");
    expect(manager.holder("file:c")).toBe("task-b");
  });

  it("lists held locks without exposing queued resource requests", () => {
    const manager = new ResourceManager({ now: () => 1000 });
    manager.acquire("task-a", ["file:b", "file:a"]);
    manager.acquire("task-b", ["file:a", "file:c"]);

    expect(manager.listHeldLocks()).toEqual([
      { resource: "file:a", task_id: "task-a", acquired_at: 1000 },
      { resource: "file:b", task_id: "task-a", acquired_at: 1000 },
    ]);
  });

  it("does not acquire a partial batch when any requested resource is held", () => {
    const manager = new ResourceManager();
    manager.acquire("task-a", ["file:a"]);

    const result = manager.acquire("task-b", ["file:b", "file:a"]);

    expect(result).toMatchObject({ ok: true, value: { status: "queued" } });
    expect(manager.holder("file:b")).toBeUndefined();
  });

  it("force-releases expired locks and reports the stuck task", () => {
    let now = 1_000;
    const manager = new ResourceManager({ maxLockDurationMs: 100, now: () => now });
    manager.acquire("task-a", ["file:a"]);
    now = 1_101;

    const expired = manager.expireLocks();

    expect(expired).toEqual(["task-a"]);
    expect(manager.holder("file:a")).toBeUndefined();
  });
});
