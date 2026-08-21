# Performance Goals

## Purpose

States NOVA's concrete, numeric performance targets — replacing the
vague "fast enough to feel responsive" framing this project's foundational
review flagged as insufficient with actual engineering budgets every
component is measured against.

## Scope

Target latency, resource usage, and cost figures. How these targets are
achieved architecturally is `scalability.md`, `caching.md`,
`concurrency.md`, and `optimization.md`; how they are measured is
`benchmarks.md`.

## Latency targets

| Operation | Target |
|---|---|
| Knowledge Graph query (normal retrieval) | < 100ms |
| Resource lock acquire | < 20ms |
| Resource lock release | Immediate |
| Simple deterministic command (e.g., file open, git status) | < 2 seconds end to end |
| Reasoning-required response (summarization, planning) | < 5 seconds to first meaningful output |
| Large autonomous workflow | No fixed ceiling; progressive step-by-step updates required throughout (`docs/09-ui/task-monitor.md`) rather than a blocking wait |

## Resource usage targets

| State | CPU | RAM |
|---|---|---|
| Idle (no active task, observers running) | < 3% | < 600MB |
| Active task | Dynamic, scaled to available system resources | Dynamic, bounded by `docs/11-performance/resource-usage.md`'s ceiling to avoid monopolizing the system |

NOVA must never monopolize the host system — a heavy background task
degrades gracefully in priority relative to the user's own foreground
work rather than competing for resources at equal priority
(`docs/03-runtime/scheduler.md`).

## Cost targets

The runtime never invokes an LLM when deterministic execution can solve
the task (`docs/05-ai/deterministic-first.md`) — this is itself the
primary cost-control mechanism, more significant than any per-call
optimization, since it eliminates the majority of potential LLM calls
before cost even becomes a factor. Where an LLM call is genuinely
required, the Model Router (`docs/05-ai/model-router.md`) selects the
lowest-cost option meeting the required capability and latency bar,
preferring local models where configured.

## How targets are enforced, not merely aspired to

Each target above is measured directly from pipeline traces
(`docs/02-architecture/execution-pipeline.md`) and tracked as part of the
benchmark suite (`benchmarks.md`) — a regression against any of these
targets is treated as a defect requiring investigation, not an
acceptable drift, consistent with the "Task Success Score" scoring
philosophy (`docs/01-product/success-metrics.md`) of not tolerating
silent, undetected degradation.

## Related documents

- `docs/25-failure-modes/FM-16-resource-management-and-performance.md` — failure modes for this subsystem
- `scalability.md`, `caching.md`, `concurrency.md`, `optimization.md` —
  the mechanisms achieving these targets
- `benchmarks.md` — measurement methodology
- `resource-usage.md` — the detailed resource budget breakdown
