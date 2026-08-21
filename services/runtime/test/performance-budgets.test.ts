import { describe, expect, it } from "vitest";
import { PerformanceBudgetEvaluator, type BudgetSamples } from "../src/performance-budgets.js";

describe("PerformanceBudgetEvaluator", () => {
  it("passes documented budgets when samples are within target", () => {
    const samples: BudgetSamples = {
      chat_first_token_local_ms: [400, 600, 700],
      chat_first_token_cloud_ms: [1_200, 1_500, 1_900],
      memory_query_ms: [80, 100, 140, 149],
      app_cold_start_ms: [1_800],
      voice_round_trip_ms: [1_000],
    };

    const report = new PerformanceBudgetEvaluator().evaluate(samples);

    expect(report.passed).toBe(true);
    expect(report.release_blocked).toBe(false);
    expect(report.violations).toEqual([]);
  });

  it("blocks release when a p95 or single-value budget is exceeded", () => {
    const samples: BudgetSamples = {
      chat_first_token_local_ms: [400, 600, 700, 900],
      chat_first_token_cloud_ms: [1_900],
      memory_query_ms: [100, 120, 150, 151],
      app_cold_start_ms: [2_001],
      voice_round_trip_ms: [1_201],
    };

    const report = new PerformanceBudgetEvaluator().evaluate(samples);

    expect(report.passed).toBe(false);
    expect(report.release_blocked).toBe(true);
    expect(report.violations.map((violation) => violation.budget)).toEqual([
      "chat_first_token_local_ms",
      "memory_query_p95_ms",
      "app_cold_start_ms",
      "voice_round_trip_ms",
    ]);
  });

  it("rejects empty samples instead of claiming a passing benchmark", () => {
    const report = new PerformanceBudgetEvaluator().evaluate({ memory_query_ms: [] });

    expect(report.passed).toBe(false);
    expect(report.release_blocked).toBe(true);
    expect(report.violations[0]).toMatchObject({
      budget: "memory_query_p95_ms",
      reason: "no_samples",
    });
  });
});
