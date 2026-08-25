import { describe, expect, it } from "vitest";
import { TaskScheduler } from "../src/task-scheduler.js";

describe("TaskScheduler", () => {
  it("dispatches interactive work before default and background work", async () => {
    const started: string[] = [];
    const resolvers = new Map<string, () => void>();
    const scheduler = new TaskScheduler(
      {
        execute: async (taskId) => {
          started.push(taskId);
          await new Promise<void>((resolve) => resolvers.set(taskId, resolve));
          return { ok: true as const, value: undefined };
        },
      },
      { maxConcurrent: 1, starvationThresholdMs: 60_000, now: () => 0 },
    );

    scheduler.enqueue("background", "background", 0);
    scheduler.enqueue("default", "default", 1);
    scheduler.enqueue("interactive", "interactive", 2);
    const draining = scheduler.dispatch();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(started).toEqual(["interactive"]);
    resolvers.get("interactive")?.();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(started).toEqual(["interactive", "default"]);
    resolvers.get("default")?.();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(started).toEqual(["interactive", "default", "background"]);
    resolvers.get("background")?.();
    await draining;
  });

  it("ages older background work until it can outrank newer interactive work", async () => {
    let currentTime = 120_000;
    const started: string[] = [];
    const resolvers = new Map<string, () => void>();
    const scheduler = new TaskScheduler(
      {
        execute: async (taskId) => {
          started.push(taskId);
          await new Promise<void>((resolve) => resolvers.set(taskId, resolve));
          return { ok: true as const, value: undefined };
        },
      },
      { maxConcurrent: 1, starvationThresholdMs: 60_000, now: () => currentTime },
    );

    scheduler.enqueue("old-background", "background", 0);
    scheduler.enqueue("new-interactive", "interactive", currentTime);
    const draining = scheduler.dispatch();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(started).toEqual(["old-background"]);
    currentTime += 60_000;
    resolvers.get("old-background")?.();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(started).toEqual(["old-background", "new-interactive"]);
    resolvers.get("new-interactive")?.();
    await draining;
  });

  it("reports bounded scheduler status without task identifiers or payloads", () => {
    const scheduler = new TaskScheduler(
      { execute: async () => ({ ok: true as const, value: undefined }) },
      { maxConcurrent: 2, starvationThresholdMs: 60_000, now: () => 0 },
    );
    scheduler.enqueue("queued-task", "default", 0);

    expect(scheduler.status()).toEqual({ queued_count: 1, active_count: 0, max_concurrent: 2 });
  });

  it("cancels queued work without preempting work already in flight", async () => {
    let releaseFirst: (() => void) | undefined;
    const started: string[] = [];
    const scheduler = new TaskScheduler(
      {
        execute: async (taskId) => {
          started.push(taskId);
          if (taskId === "running") {
            await new Promise<void>((resolve) => {
              releaseFirst = resolve;
            });
          }
          return { ok: true as const, value: undefined };
        },
      },
      { maxConcurrent: 1, starvationThresholdMs: 60_000, now: () => 0 },
    );

    scheduler.enqueue("running", "interactive", 0);
    scheduler.enqueue("cancelled", "default", 1);
    const draining = scheduler.dispatch();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(scheduler.cancel("cancelled")).toBe(true);
    expect(scheduler.cancel("running")).toBe(false);
    releaseFirst?.();
    await draining;
    expect(started).toEqual(["running"]);
  });

  it("does not exceed the configured concurrent task limit", async () => {
    let active = 0;
    let maximum = 0;
    const resolvers: Array<() => void> = [];
    const scheduler = new TaskScheduler(
      {
        execute: async () => {
          active += 1;
          maximum = Math.max(maximum, active);
          await new Promise<void>((resolve) => resolvers.push(resolve));
          active -= 1;
          return { ok: true as const, value: undefined };
        },
      },
      { maxConcurrent: 2, starvationThresholdMs: 60_000, now: () => 0 },
    );

    scheduler.enqueue("one", "default", 0);
    scheduler.enqueue("two", "default", 1);
    scheduler.enqueue("three", "default", 2);
    const draining = scheduler.dispatch();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(maximum).toBe(2);
    resolvers.splice(0).forEach((resolve) => resolve());
    await new Promise((resolve) => setTimeout(resolve, 0));
    resolvers.splice(0).forEach((resolve) => resolve());
    await draining;
    expect(maximum).toBe(2);
  });
});
