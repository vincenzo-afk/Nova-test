# Tracing Reference

## Purpose

This document defines the trace-level detail that complements the stable metric
names in `22-metrics-catalog.md`. Metrics answer how often and how much;
traces explain the causal path of one operation across runtime services,
observers, memory branches, providers, tools, and asynchronous bus hops.

## Trace identity

Every observable operation carries a correlation ID. A child span inherits
that correlation ID and receives a span ID; a new asynchronous boundary keeps
the same correlation ID while recording the parent span ID in the propagated
trace context. IDs are opaque strings and are never derived from secrets,
credential values, or user content.

## Canonical span boundaries

The minimum span boundaries are:

| Span | Required fields | Boundary |
|---|---|---|
| `nova.task` | `task_id`, `task_type`, `workspace_id` | Task Manager accepts a task and records its terminal outcome |
| `nova.plan` | `task_id`, `step_count`, `risk_tier` | Planner produces or rejects a bounded plan |
| `nova.tool` | `tool_id`, `risk_tier`, `result` | Executor invokes and verifies one registered tool |
| `nova.memory.query` | `branch`, `workspace_id`, `result_count` | Retrieval branch begins and returns its candidates |
| `nova.provider.call` | `provider_id`, `capability`, `fallback_index` | Model Router starts and completes one provider attempt |
| `nova.bus.publish` | `topic`, `schema_version`, `delivery` | Communication Bus publishes, retries, or dead-letters an envelope |

Each span records `started_at`, `ended_at`, `status`, and the correlation ID.
Timestamps use the UTC and monotonic-duration rules in
`docs/00-overview/time-semantics.md`; the duration is never reconstructed from
local wall-clock values when a monotonic timer is available.

## Async and cross-device propagation

Event-bus messages and cross-device protocol messages carry the correlation
ID, parent span ID when available, schema version, and logical clock metadata.
A consumer creates a new child span before handling the message. Retries keep
the original correlation ID and add an attempt number rather than creating an
unrelated trace. Dead-lettered messages preserve the same trace context for
recovery and diagnostics.

## Sampling and privacy

Tracing must not record secrets, raw credential values, message bodies, or
unredacted personal data. Span attributes use stable IDs, bounded enums,
counts, sizes, and redacted error metadata. A local-first runtime may retain
full traces locally for the configured diagnostic window; export is optional
and must pass the same permission and redaction boundary as diagnostics.

## Failure behavior

Trace propagation failure must not block the user operation. The runtime
creates a fresh local correlation ID and emits an observability diagnostic
when an incoming context is malformed. Telemetry delivery is buffered and
retried where configured; a collector outage degrades telemetry only and
must not mutate task, memory, or protected configuration state. These rules
address `FM-17-004` and `FM-17-007` in
`docs/25-failure-modes/FM-17-observability.md`.

## Related documents

- `22-metrics-catalog.md` — stable aggregate measurements fed by traces
- `docs/13-devops/logging.md` — structured log fields and redaction
- `docs/13-devops/monitoring.md` — operational dashboards and alerting
- `docs/08-api/schemas.md` — schema-versioning rules for propagated messages
- `docs/00-overview/time-semantics.md` — UTC timestamps and logical duration
