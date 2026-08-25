import { describe, expect, it, vi } from "vitest";
import { MemoryLogSink, StructuredLogger } from "@nova/shared";
import {
  InMemoryJobStore,
  JobScheduler,
  type JobDefinition,
  type JobState,
} from "../src/job-scheduler.js";

const definition = (overrides: Partial<JobDefinition> = {}): JobDefinition => ({
  job_id: "briefing",
  type: "recurring",
  schedule: "1h",
  dependencies: [],
  priority: "low",
  concurrency_group: "background",
  idempotent: true,
  ...overrides,
});

const state = (overrides: Partial<JobState> = {}): JobState => ({
  definition: definition(),
  last_run_at: "2026-08-24T08:00:00.000Z",
  next_run_at: "2026-08-24T09:00:00.000Z",
  status: "scheduled",
  ...overrides,
});

describe("JobScheduler", () => {
  it("persists a recurring job, executes it when due, and schedules the next occurrence", async () => {
    const store = new InMemoryJobStore();
    const run = vi.fn(async () => undefined);
    let now = Date.parse("2026-08-24T10:00:00.000Z");
    const scheduler = new JobScheduler(store, {
      now: () => now,
      runner: run,
    });

    expect(scheduler.register(definition())).toMatchObject({
      ok: true,
      value: {
        definition: { job_id: "briefing" },
        status: "scheduled",
        next_run_at: "2026-08-24T10:00:00.000Z",
      },
    });
    expect(await scheduler.runDue()).toMatchObject({ ok: true, value: ["briefing"] });
    expect(run).toHaveBeenCalledOnce();
    expect(scheduler.get("briefing")).toMatchObject({
      ok: true,
      value: { last_run_at: "2026-08-24T10:00:00.000Z", next_run_at: "2026-08-24T11:00:00.000Z" },
    });

    now += 30 * 60 * 1_000;
    expect(await scheduler.runDue()).toMatchObject({ ok: true, value: [] });
    expect(run).toHaveBeenCalledOnce();
  });

  it("runs due dependencies before dependents and serializes a shared concurrency group", async () => {
    const store = new InMemoryJobStore();
    const order: string[] = [];
    const scheduler = new JobScheduler(store, {
      now: () => Date.parse("2026-08-24T10:00:00.000Z"),
      runner: async (job) => {
        order.push(job.job_id);
        expect(scheduler.activeGroups()).toEqual(["background"]);
      },
    });
    scheduler.register(definition({ job_id: "prepare", schedule: "1h" }));
    scheduler.register(
      definition({ job_id: "briefing", dependencies: ["prepare"], schedule: "1h" }),
    );

    expect(await scheduler.runDue()).toMatchObject({ ok: true, value: ["prepare", "briefing"] });
    expect(order).toEqual(["prepare", "briefing"]);
    expect(scheduler.activeGroups()).toEqual([]);
  });

  it("catches up a missed recurring job after loading persisted state", async () => {
    const store = new InMemoryJobStore([state()]);
    const run = vi.fn(async () => undefined);
    const scheduler = new JobScheduler(store, {
      now: () => Date.parse("2026-08-24T10:00:00.000Z"),
      runner: run,
    });

    expect(await scheduler.start()).toMatchObject({ ok: true, value: ["briefing"] });
    expect(run).toHaveBeenCalledOnce();
    expect(scheduler.get("briefing")).toMatchObject({
      value: { last_run_at: "2026-08-24T10:00:00.000Z", next_run_at: "2026-08-24T11:00:00.000Z" },
    });
  });

  it("lists scheduled job states without running or mutating jobs", () => {
    const scheduler = new JobScheduler(new InMemoryJobStore(), {
      now: () => Date.parse("2026-08-24T10:00:00.000Z"),
    });
    scheduler.register(definition({ job_id: "zeta", priority: "normal" }));
    scheduler.register(definition({ job_id: "alpha", priority: "low" }));

    expect(scheduler.listStates()).toMatchObject([
      { definition: { job_id: "alpha" }, status: "scheduled" },
      { definition: { job_id: "zeta" }, status: "scheduled" },
    ]);
  });

  it("cancels a running job through its abort signal and records a safe diagnostic", async () => {
    const sink = new MemoryLogSink();
    let resolveRun: (() => void) | undefined;
    const run = vi.fn(
      (job: JobDefinition, signal: AbortSignal) =>
        new Promise<void>((resolve) => {
          resolveRun = resolve;
          signal.addEventListener("abort", () => resolve(), { once: true });
          expect(job.job_id).toBe("briefing");
        }),
    );
    const scheduler = new JobScheduler(new InMemoryJobStore(), {
      now: () => Date.parse("2026-08-24T10:00:00.000Z"),
      runner: run,
      logger: new StructuredLogger({ service: "runtime.jobs", sink }),
    });
    scheduler.register(definition());
    const running = scheduler.runDue();
    await vi.waitFor(() => expect(run).toHaveBeenCalledOnce());

    expect(scheduler.cancel("briefing")).toMatchObject({ ok: true });
    resolveRun?.();
    expect(await running).toMatchObject({ ok: true, value: [] });
    expect(sink.records().map((record) => record.event)).toContain("job.cancelled");
    expect(JSON.stringify(sink.records())).not.toContain("payload");
  });
});
