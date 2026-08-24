import { describe, expect, it } from "vitest";
import { MemoryLogSink, StructuredLogger } from "@nova/shared";
import { PersonalAnalytics, type AnalyticsInput } from "../src/personal-analytics.js";

const period = {
  from: "2026-08-01T00:00:00.000Z",
  to: "2026-09-01T00:00:00.000Z",
} as const;

const input = (): AnalyticsInput => ({
  period,
  activity: [
    {
      occurred_at: "2026-08-03T10:00:00.000Z",
      source: "applications",
      domain: "development",
      label: "Editor",
      duration_ms: 90 * 60 * 1_000,
    },
    {
      occurred_at: "2026-08-04T10:00:00.000Z",
      source: "browser",
      domain: "research",
      label: "Docs",
      duration_ms: 30 * 60 * 1_000,
    },
    {
      occurred_at: "2026-07-31T23:59:59.000Z",
      source: "applications",
      domain: "outside",
      label: "Ignored",
      duration_ms: 99,
    },
  ],
  tasks: [
    { task_id: "task-completed", state: "Completed", updated_at: "2026-08-05T12:00:00.000Z" },
    { task_id: "task-progress", state: "Executing", updated_at: "2026-08-06T12:00:00.000Z" },
    { task_id: "task-abandoned", state: "Cancelled", updated_at: "2026-08-07T12:00:00.000Z" },
    { task_id: "task-outside", state: "Completed", updated_at: "2026-07-31T12:00:00.000Z" },
  ],
  provider_usage: [
    {
      occurred_at: "2026-08-08T12:00:00.000Z",
      capability_id: "speech-to-text",
      provider_id: "local.whisper",
      request_count: 4,
      cost: 0,
    },
    {
      occurred_at: "2026-08-09T12:00:00.000Z",
      capability_id: "llm",
      provider_id: "cloud.groq",
      request_count: 2,
      cost: 0.04,
    },
  ],
  communications: [
    {
      occurred_at: "2026-08-10T12:00:00.000Z",
      channel: "email",
      topic: "project",
      message_count: 3,
    },
    {
      occurred_at: "2026-07-31T12:00:00.000Z",
      channel: "chat",
      topic: "outside",
      message_count: 99,
    },
  ],
});

describe("PersonalAnalytics", () => {
  it("aggregates in-period activity by domain and label without creating a tracker", () => {
    const analytics = new PersonalAnalytics();

    const report = analytics.generate(input());

    expect(report).toMatchObject({
      period,
      time_allocation: [
        { domain: "development", label: "Editor", duration_ms: 90 * 60 * 1_000 },
        { domain: "research", label: "Docs", duration_ms: 30 * 60 * 1_000 },
      ],
    });
    expect(report.time_allocation).toHaveLength(2);
  });

  it("summarizes task outcomes and provider usage for the selected period", () => {
    const analytics = new PersonalAnalytics();

    const report = analytics.generate(input());

    expect(report.task_summary).toEqual({ completed: 1, in_progress: 1, abandoned: 1 });
    expect(report.provider_usage).toEqual([
      {
        capability_id: "speech-to-text",
        provider_id: "local.whisper",
        request_count: 4,
        cost: 0,
      },
      { capability_id: "llm", provider_id: "cloud.groq", request_count: 2, cost: 0.04 },
    ]);
  });

  it("summarizes communication volume without reproducing message content", () => {
    const analytics = new PersonalAnalytics();

    const report = analytics.generate(input());

    expect(report.communication_summary).toEqual([
      { channel: "email", topic: "project", message_count: 3 },
    ]);
    expect(JSON.stringify(report)).not.toContain("raw");
  });

  it("emits bounded local diagnostics without sensitive labels or payloads", () => {
    const sink = new MemoryLogSink();
    const analytics = new PersonalAnalytics(
      new StructuredLogger({ service: "runtime.analytics", sink }),
    );

    const baseInput = input();
    analytics.generate({
      ...baseInput,
      activity: baseInput.activity.map((event, index) =>
        index === 0 ? { ...event, label: "raw secret content" } : event,
      ),
    });

    expect(sink.records()).toContainEqual(
      expect.objectContaining({
        event: "analytics.report.generated",
        details: expect.objectContaining({
          activity_event_count: 2,
          task_count: 3,
          provider_usage_count: 2,
          communication_event_count: 1,
        }),
      }),
    );
    expect(JSON.stringify(sink.records())).not.toContain("raw secret content");
  });
});
