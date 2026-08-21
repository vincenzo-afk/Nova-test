# Metrics Catalog

## Purpose

The named, stable metric list NOVA emits for self-monitoring
(`docs/13-devops/monitoring.md`) and benchmarking
(`docs/11-performance/benchmarks.md`) — those two documents describe
*what is monitored* qualitatively; this is the concrete, stable-named
catalog an alerting rule or dashboard panel is actually built against,
following the same catalog convention as `06-error-catalog.md` and
`07-event-catalog.md`.

## Scope

Metric names, types, and labels. Alert thresholds built on these metrics
are `docs/39-performance-budgets/`'s budget values; trace-level detail
(a single request's span breakdown, as opposed to an aggregated metric)
is `docs/26-system-reference/23-tracing.md`.

## Naming convention

`nova.{subsystem}.{measurement}[.{unit}]` — e.g.,
`nova.runtime_manager.service_heartbeat_age.ms`. Stable once shipped;
per the same allocation discipline as the error/event catalogs, a metric
name is never reused for a different measurement, and a retired metric's
name is not reassigned.

## Catalog by subsystem

| Metric | Type | Labels | Source |
|---|---|---|---|
| `nova.runtime_manager.service_heartbeat_age.ms` | Gauge | `service_id` | `docs/03-runtime/runtime-manager.md`'s heartbeat mechanism |
| `nova.runtime_manager.service_restart_count` | Counter | `service_id` | Same — feeds `monitoring.md`'s degraded-status-after-repeated-restarts detection |
| `nova.resource.cpu_pct` | Gauge | `service_id` | `docs/11-performance/resource-usage.md`'s idle/active budgets |
| `nova.resource.ram_mb` | Gauge | `service_id` | Same |
| `nova.bus.queue_depth` | Gauge | `topic` | Communication Bus backpressure detection (`monitoring.md`) |
| `nova.task.stuck_count` | Gauge | — | Tasks exceeding step/time budget without progress (`docs/03-runtime/planner.md`) |
| `nova.storage.growth_rate.mb_per_day` | Gauge | `engine` (structured/vector/graph/blob) | Surfaced to Memory Explorer per `monitoring.md` |
| `nova.retrieval.query_latency.ms` | Histogram | `branch` (semantic/keyword/graph/temporal/entity) | `docs/04-memory/retrieval-engine.md`'s fusion pipeline, per-branch |
| `nova.provider.circuit_state` | Gauge (0=Closed, 1=HalfOpen, 2=Open) | `provider_id` | `docs/26-system-reference/19-ordering-concurrency-and-retry-rules.md`'s canonical breaker |
| `nova.task.duration.ms` | Histogram | `task_type` | `docs/03-runtime/task-manager.md`'s state transition timestamps |
| `nova.tool.invocation_count` | Counter | `tool_id`, `result` (success/failure/timeout) | Tool Registry / Executor |

## Adding a new metric

Same discipline as the error/event catalogs: add a row here in the same
change that introduces the metric, with a name following the naming
convention above — a metric added to code without a corresponding
catalog row is the metrics-catalog equivalent of `FM-24-019` (event
catalog omitting a real event type), and is treated as the same class of
documentation-drift defect.

## Related documents

- `docs/13-devops/monitoring.md` — what is monitored, qualitatively, and how it's surfaced to the user
- `docs/11-performance/benchmarks.md` — how these metrics feed release-over-release performance tracking
- `docs/39-performance-budgets/` — the threshold values these metrics are compared against
- `06-error-catalog.md`, `07-event-catalog.md` — the sibling catalogs this one follows the convention of
