import { describe, expect, it, vi } from "vitest";
import { MemoryLogSink, StructuredLogger } from "@nova/shared";
import {
  BackgroundAssistant,
  type BriefingSource,
  type ProactiveDestination,
} from "../src/background-assistant.js";
import { InMemoryJobStore, JobScheduler } from "../src/job-scheduler.js";

const source = (id: string, items: number): BriefingSource => ({
  source_id: id,
  collect: vi.fn(async () =>
    Array.from({ length: items }, (_, index) => ({
      title: `${id}-${index}`,
      summary: "summary",
      source_id: id,
      requires_confirmation: index === 0,
    })),
  ),
});

const scheduledDefinition = () => ({
  job_id: "morning-briefing",
  type: "recurring" as const,
  schedule: "1h",
  dependencies: [],
  priority: "low" as const,
  concurrency_group: "background-briefings",
  idempotent: true,
});

describe("BackgroundAssistant", () => {
  it("does not collect or deliver when proactive mode is disabled", async () => {
    const calendar = source("calendar", 1);
    const destination: ProactiveDestination = { deliver: vi.fn(async () => undefined) };
    const assistant = new BackgroundAssistant([calendar], destination, { enabled: false });

    expect(await assistant.generate("time-based")).toMatchObject({
      ok: true,
      value: { items: [] },
    });
    expect(calendar.collect).not.toHaveBeenCalled();
    expect(destination.deliver).not.toHaveBeenCalled();
  });

  it("composes source-attributed items and preserves confirmation boundaries", async () => {
    const calendar = source("calendar", 1);
    const email = source("email", 1);
    const assistant = new BackgroundAssistant(
      [calendar, email],
      { deliver: vi.fn(async () => undefined) },
      { enabled: true },
    );

    const briefing = await assistant.generate("explicit-request");

    expect(briefing).toMatchObject({
      ok: true,
      value: {
        trigger: "explicit-request",
        items: [{ source_id: "calendar" }, { source_id: "email" }],
      },
    });
    expect(briefing.ok && briefing.value.items.every((item) => item.requires_confirmation)).toBe(
      true,
    );
  });

  it("registers and executes a low-priority scheduled briefing through JobScheduler", async () => {
    const destination: ProactiveDestination = { deliver: vi.fn(async () => undefined) };
    const assistant = new BackgroundAssistant([source("tasks", 1)], destination, { enabled: true });
    const scheduler = new JobScheduler(new InMemoryJobStore(), {
      now: () => Date.parse("2026-08-24T10:00:00.000Z"),
      runner: async () => undefined,
    });

    expect(assistant.registerScheduledBriefing(scheduler, scheduledDefinition())).toMatchObject({
      ok: true,
      value: {
        definition: { job_id: "morning-briefing", priority: "low" },
      },
    });
    expect(await scheduler.runDue()).toMatchObject({
      ok: true,
      value: ["morning-briefing"],
    });
    expect(destination.deliver).toHaveBeenCalledOnce();
  });

  it("does not register a scheduled briefing while proactive mode is disabled", () => {
    const assistant = new BackgroundAssistant(
      [],
      { deliver: vi.fn(async () => undefined) },
      { enabled: false },
    );
    const scheduler = new JobScheduler(new InMemoryJobStore(), {
      now: () => Date.parse("2026-08-24T10:00:00.000Z"),
      runner: async () => undefined,
    });

    expect(assistant.registerScheduledBriefing(scheduler, scheduledDefinition())).toMatchObject({
      ok: false,
      error: { code: "NOVA-AI002" },
    });
  });

  it("emits only bounded scheduling diagnostics and never logs briefing content", async () => {
    const sink = new MemoryLogSink();
    const destination: ProactiveDestination = { deliver: vi.fn(async () => undefined) };
    const assistant = new BackgroundAssistant([source("tasks", 1)], destination, {
      enabled: true,
      logger: new StructuredLogger({ service: "runtime.background", sink }),
    });
    const scheduler = new JobScheduler(new InMemoryJobStore(), {
      now: () => Date.parse("2026-08-24T10:00:00.000Z"),
      runner: async () => undefined,
    });
    assistant.registerScheduledBriefing(scheduler, scheduledDefinition());

    await scheduler.runDue();

    expect(sink.records().map((record) => record.event)).toEqual([
      "background.briefing.generated",
      "background.briefing.delivered",
    ]);
    expect(JSON.stringify(sink.records())).not.toContain("summary");
  });

  it("delivers only to the configured destination", async () => {
    const destination: ProactiveDestination = { deliver: vi.fn(async () => undefined) };
    const assistant = new BackgroundAssistant([source("tasks", 1)], destination, { enabled: true });
    const briefing = await assistant.generate("event-based");

    expect(
      await assistant.deliver(briefing.ok ? briefing.value : { trigger: "event-based", items: [] }),
    ).toMatchObject({ ok: true });
    expect(destination.deliver).toHaveBeenCalledOnce();
  });
});
