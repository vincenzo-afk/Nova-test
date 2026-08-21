export type BudgetName =
  | "chat_first_token_local_ms"
  | "chat_first_token_cloud_ms"
  | "memory_query_p95_ms"
  | "app_cold_start_ms"
  | "voice_round_trip_ms";

export interface BudgetSamples {
  readonly chat_first_token_local_ms?: readonly number[];
  readonly chat_first_token_cloud_ms?: readonly number[];
  readonly memory_query_ms?: readonly number[];
  readonly app_cold_start_ms?: readonly number[];
  readonly voice_round_trip_ms?: readonly number[];
}

export interface BudgetViolation {
  readonly budget: BudgetName;
  readonly target_ms: number;
  readonly observed_ms?: number;
  readonly reason: "no_samples" | "target_exceeded";
}

export interface PerformanceBudgetReport {
  readonly passed: boolean;
  readonly release_blocked: boolean;
  readonly violations: readonly BudgetViolation[];
}

const TARGETS: Readonly<Record<BudgetName, number>> = {
  chat_first_token_local_ms: 800,
  chat_first_token_cloud_ms: 2_000,
  memory_query_p95_ms: 150,
  app_cold_start_ms: 2_000,
  voice_round_trip_ms: 1_200,
};

export class PerformanceBudgetEvaluator {
  public evaluate(samples: BudgetSamples): PerformanceBudgetReport {
    const observations: ReadonlyArray<
      readonly [BudgetName, readonly number[] | undefined, number]
    > = [
      [
        "chat_first_token_local_ms",
        samples.chat_first_token_local_ms,
        max(samples.chat_first_token_local_ms),
      ],
      [
        "chat_first_token_cloud_ms",
        samples.chat_first_token_cloud_ms,
        max(samples.chat_first_token_cloud_ms),
      ],
      ["memory_query_p95_ms", samples.memory_query_ms, percentile95(samples.memory_query_ms)],
      ["app_cold_start_ms", samples.app_cold_start_ms, max(samples.app_cold_start_ms)],
      ["voice_round_trip_ms", samples.voice_round_trip_ms, max(samples.voice_round_trip_ms)],
    ];

    const violations: BudgetViolation[] = [];
    for (const [budget, values, observed] of observations) {
      if (values === undefined) continue;
      if (values.length === 0) {
        violations.push({ budget, target_ms: TARGETS[budget], reason: "no_samples" });
      } else if (observed > TARGETS[budget]) {
        violations.push({
          budget,
          target_ms: TARGETS[budget],
          observed_ms: observed,
          reason: "target_exceeded",
        });
      }
    }

    return { passed: violations.length === 0, release_blocked: violations.length > 0, violations };
  }
}

function max(values: readonly number[] | undefined): number {
  return values && values.length > 0 ? Math.max(...values) : Number.NaN;
}

function percentile95(values: readonly number[] | undefined): number {
  if (!values || values.length === 0) return Number.NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const result = sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)];
  return result ?? Number.NaN;
}
