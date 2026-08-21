# Performance Benchmarks

## Purpose

Defines how the numeric targets in `performance-goals.md` are actually
measured and tracked over time, so "we hit our latency target" is a
verifiable claim rather than an impression. This document covers
performance measurement methodology specifically; the test-execution
infrastructure that runs these benchmarks as part of CI is
`docs/12-testing/benchmarks.md`.

## Scope

What is measured and how, for performance purposes. Test infrastructure
and CI integration is `docs/12-testing/`.

## Measured metrics, mapped to targets

| Metric | Source | Target reference |
|---|---|---|
| Knowledge Graph query latency (p50, p95) | Pipeline traces (`docs/02-architecture/execution-pipeline.md`) | `performance-goals.md` |
| Resource lock acquire/release latency | Resource Manager instrumentation | `performance-goals.md` |
| End-to-end task latency, by task type | Task Manager state transition timestamps (`docs/03-runtime/task-manager.md`) | `performance-goals.md` |
| Idle CPU/RAM | Runtime Manager self-monitoring (`docs/03-runtime/runtime-manager.md`) | `resource-usage.md` |
| Proportion of tasks resolved deterministically | Pipeline traces, per `docs/01-product/success-metrics.md` | Optimization effectiveness, `optimization.md` |

## Benchmark suite composition

A fixed set of representative tasks spanning the use cases in
`docs/01-product/use-cases.md` (deterministic file operations,
reasoning-required summarization, multi-step planning, GUI-automation
scenarios against allow-listed applications) is run against a controlled
environment on a regular cadence, with results tracked over time rather
than measured only once at release.

## Regression detection

A result exceeding its target by a configured margin is flagged as a
performance regression requiring investigation before release —
consistent with the "no silent degradation" philosophy established for
Task Success Score (`docs/01-product/success-metrics.md`), extended here
to system performance itself.

## Realistic-scale testing

Given the scalability concerns in `scalability.md`, the benchmark suite
includes runs against artificially aged datasets (simulating months/years
of accumulated Memory and Knowledge Graph growth), not only against a
freshly initialized instance — a system that meets its latency targets
only on day one is not considered to have met them at all, per the
scaling requirement in `scalability.md`.

## AI quality evaluation (beyond pure performance)

Alongside the latency/resource metrics above, the benchmark suite tracks
AI-quality-specific metrics that a purely performance-focused suite would
miss:

| Metric | What it measures | Primary source |
|---|---|---|
| Task success rate | Task Success Score outcomes over the golden dataset, per `docs/01-product/success-metrics.md` | `docs/12-testing/simulation-tests.md` |
| Memory retrieval precision/recall | Whether Search returns the correct grounded records for known queries | `docs/04-memory/search.md`'s golden query set |
| Tool selection accuracy | Whether Tool Selection's ranking (`docs/05-ai/tool-selection.md`) picks the tool a human reviewer would also pick, for ambiguous-candidate cases | Simulation test golden dataset |
| False positive rate | How often a destructive/irreversible risk-tier classification is applied to an action a human reviewer would call reversible (over-caution) and vice versa (under-caution) | Human evaluation, `docs/12-testing/simulation-tests.md` |
| Hallucination rate | How often a synthesized answer (`docs/04-memory/search.md`) includes a claim not traceable to a grounding reference | Automated grounding-reference validation, sampled for human confirmation |

Hallucination rate specifically is measured as a **structural** check
first — an answer whose claims cannot be traced to `grounding_references`
(`docs/05-ai/explainability.md`) is flagged automatically — with human
evaluation reserved for harder cases where grounding exists but the
synthesized claim still subtly misrepresents the grounded source.

## Stress testing scenarios

Beyond golden-dataset simulation, the suite includes fixed high-load
scenarios run on a slower cadence (mirroring `docs/12-testing/chaos-tests.md`'s cadence reasoning): 1,000 concurrently queued tasks
(exercising `docs/03-runtime/scheduler.md`'s concurrency limits and
starvation prevention), 100 simultaneously enabled plugins (exercising
`docs/16-extensibility/plugin-sandboxing.md`'s per-plugin resource
ceilings), a 10GB accumulated memory/graph dataset (exercising
`docs/11-performance/scalability.md`'s realistic-scale claims directly),
and 50 concurrently active Observer sources (exercising
`docs/02-architecture/event-driven-architecture.md`'s backpressure and
priority-inversion handling under sustained, not just bursty, load).

## Related documents

- `docs/25-failure-modes/FM-16-resource-management-and-performance.md` — failure modes for this subsystem
- `performance-goals.md` — the targets these benchmarks validate
- `scalability.md` — the growth scenarios benchmarked against
- `docs/12-testing/benchmarks.md`, `chaos-tests.md` — CI integration and
  the related fault-injection layer
- `docs/01-product/success-metrics.md` — the Task Success Score these
  quality metrics extend
