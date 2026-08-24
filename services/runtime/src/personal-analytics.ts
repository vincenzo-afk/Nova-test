import type { StructuredLogger } from "@nova/shared";
import type { TaskState } from "./task-manager.js";

export interface AnalyticsPeriod {
  readonly from: string;
  readonly to: string;
}

export interface ActivityAnalyticsEvent {
  readonly occurred_at: string;
  readonly source: string;
  readonly domain: string;
  readonly label: string;
  readonly duration_ms: number;
}

export interface TaskAnalyticsRecord {
  readonly task_id: string;
  readonly state: TaskState;
  readonly updated_at: string;
}

export interface ProviderUsageAnalyticsEvent {
  readonly occurred_at: string;
  readonly capability_id: string;
  readonly provider_id: string;
  readonly request_count: number;
  readonly cost: number;
}

export interface CommunicationAnalyticsEvent {
  readonly occurred_at: string;
  readonly channel: string;
  readonly topic: string;
  readonly message_count: number;
}

export interface AnalyticsInput {
  readonly period: AnalyticsPeriod;
  readonly activity: readonly ActivityAnalyticsEvent[];
  readonly tasks: readonly TaskAnalyticsRecord[];
  readonly provider_usage: readonly ProviderUsageAnalyticsEvent[];
  readonly communications: readonly CommunicationAnalyticsEvent[];
}

export interface TimeAllocation {
  readonly domain: string;
  readonly label: string;
  readonly duration_ms: number;
}

export interface TaskSummary {
  readonly completed: number;
  readonly in_progress: number;
  readonly abandoned: number;
}

export interface ProviderUsageSummary {
  readonly capability_id: string;
  readonly provider_id: string;
  readonly request_count: number;
  readonly cost: number;
}

export interface CommunicationSummary {
  readonly channel: string;
  readonly topic: string;
  readonly message_count: number;
}

export interface AnalyticsReport {
  readonly period: AnalyticsPeriod;
  readonly time_allocation: readonly TimeAllocation[];
  readonly task_summary: TaskSummary;
  readonly provider_usage: readonly ProviderUsageSummary[];
  readonly communication_summary: readonly CommunicationSummary[];
  readonly totals: {
    readonly activity_duration_ms: number;
    readonly provider_cost: number;
    readonly communication_messages: number;
  };
}

const IN_PROGRESS_STATES: ReadonlySet<TaskState> = new Set([
  "Created",
  "Planning",
  "WaitingResources",
  "Executing",
  "Verifying",
  "Retrying",
  "Paused",
  "WaitingUser",
]);
const ABANDONED_STATES: ReadonlySet<TaskState> = new Set(["Failed", "Unverified", "Cancelled"]);
const MAX_LABEL_LENGTH = 128;

export class PersonalAnalytics {
  public constructor(private readonly logger?: StructuredLogger) {}

  public generate(input: AnalyticsInput): AnalyticsReport {
    const period = normalizePeriod(input.period);
    const activity = input.activity.filter((event) => isInPeriod(event.occurred_at, period));
    const tasks = input.tasks.filter((task) => isInPeriod(task.updated_at, period));
    const providerUsage = input.provider_usage.filter((event) =>
      isInPeriod(event.occurred_at, period),
    );
    const communications = input.communications.filter((event) =>
      isInPeriod(event.occurred_at, period),
    );

    const timeAllocation = aggregateActivity(activity);
    const taskSummary = aggregateTasks(tasks);
    const providerSummary = aggregateProviderUsage(providerUsage);
    const communicationSummary = aggregateCommunications(communications);
    const report: AnalyticsReport = {
      period,
      time_allocation: timeAllocation,
      task_summary: taskSummary,
      provider_usage: providerSummary,
      communication_summary: communicationSummary,
      totals: {
        activity_duration_ms: timeAllocation.reduce((total, item) => total + item.duration_ms, 0),
        provider_cost: providerSummary.reduce((total, item) => total + item.cost, 0),
        communication_messages: communicationSummary.reduce(
          (total, item) => total + item.message_count,
          0,
        ),
      },
    };

    this.logger?.info("analytics.report.generated", {
      from: period.from,
      to: period.to,
      activity_event_count: activity.length,
      task_count: tasks.length,
      provider_usage_count: providerUsage.length,
      communication_event_count: communications.length,
      time_allocation_count: timeAllocation.length,
      provider_cost: report.totals.provider_cost,
      communication_messages: report.totals.communication_messages,
    });
    return report;
  }
}

function aggregateActivity(events: readonly ActivityAnalyticsEvent[]): readonly TimeAllocation[] {
  const totals = new Map<string, TimeAllocation>();
  for (const event of events) {
    if (!Number.isFinite(event.duration_ms) || event.duration_ms < 0) continue;
    const domain = boundedLabel(event.domain);
    const label = boundedLabel(event.label);
    const key = `${domain}\u0000${label}`;
    const previous = totals.get(key);
    totals.set(key, {
      domain,
      label,
      duration_ms: (previous?.duration_ms ?? 0) + event.duration_ms,
    });
  }
  return [...totals.values()].sort(
    (left, right) =>
      right.duration_ms - left.duration_ms ||
      left.domain.localeCompare(right.domain) ||
      left.label.localeCompare(right.label),
  );
}

function aggregateTasks(tasks: readonly TaskAnalyticsRecord[]): TaskSummary {
  let completed = 0;
  let inProgress = 0;
  let abandoned = 0;
  for (const task of tasks) {
    if (task.state === "Completed") completed += 1;
    else if (IN_PROGRESS_STATES.has(task.state)) inProgress += 1;
    else if (ABANDONED_STATES.has(task.state)) abandoned += 1;
  }
  return { completed, in_progress: inProgress, abandoned };
}

function aggregateProviderUsage(
  events: readonly ProviderUsageAnalyticsEvent[],
): readonly ProviderUsageSummary[] {
  const totals = new Map<string, ProviderUsageSummary>();
  for (const event of events) {
    if (
      !Number.isSafeInteger(event.request_count) ||
      event.request_count < 0 ||
      !Number.isFinite(event.cost) ||
      event.cost < 0
    )
      continue;
    const capabilityId = boundedLabel(event.capability_id);
    const providerId = boundedLabel(event.provider_id);
    const key = `${capabilityId}\u0000${providerId}`;
    const previous = totals.get(key);
    totals.set(key, {
      capability_id: capabilityId,
      provider_id: providerId,
      request_count: (previous?.request_count ?? 0) + event.request_count,
      cost: roundCost((previous?.cost ?? 0) + event.cost),
    });
  }
  return [...totals.values()];
}

function aggregateCommunications(
  events: readonly CommunicationAnalyticsEvent[],
): readonly CommunicationSummary[] {
  const totals = new Map<string, CommunicationSummary>();
  for (const event of events) {
    if (!Number.isSafeInteger(event.message_count) || event.message_count < 0) continue;
    const channel = boundedLabel(event.channel);
    const topic = boundedLabel(event.topic);
    const key = `${channel}\u0000${topic}`;
    const previous = totals.get(key);
    totals.set(key, {
      channel,
      topic,
      message_count: (previous?.message_count ?? 0) + event.message_count,
    });
  }
  return [...totals.values()];
}

function normalizePeriod(period: AnalyticsPeriod): AnalyticsPeriod {
  return { from: period.from, to: period.to };
}

function isInPeriod(value: string, period: AnalyticsPeriod): boolean {
  const timestamp = Date.parse(value);
  const from = Date.parse(period.from);
  const to = Date.parse(period.to);
  return Number.isFinite(timestamp) && Number.isFinite(from) && Number.isFinite(to)
    ? timestamp >= from && timestamp < to
    : false;
}

function boundedLabel(value: string): string {
  return value.trim().slice(0, MAX_LABEL_LENGTH);
}

function roundCost(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}
