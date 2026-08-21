# Monitoring

## Purpose

Specifies NOVA's self-monitoring — resource usage, service health, queue
depth, and stuck-task detection — implementing the self-monitoring
capability this project's foundational review identified as a
required, not optional, feature for any persistent background system.

## Scope

Self-monitoring mechanics and alerting. Diagnostic log content is
`logging.md`; the resource budget being monitored against is
`docs/11-performance/resource-usage.md`.

## What is monitored

- **Service health** — heartbeat status per supervised service
  (`docs/03-runtime/runtime-manager.md`), including degraded-status
  detection after repeated restart failures.
- **Resource usage** — CPU/RAM against the budgets in
  `docs/11-performance/resource-usage.md`, tracked continuously, not
  sampled only at startup.
- **Queue depth** — per-topic Communication Bus queue depth
  (`docs/02-architecture/communication-model.md`), flagging sustained
  backpressure that might indicate a stuck or overwhelmed consumer.
- **Stuck-task detection** — a task exceeding its configured step/time
  budget (`docs/03-runtime/planner.md`) without progress is flagged
  distinctly from a task that is legitimately still working within its
  budget.
- **Storage growth rate** — surfaced to the user (via Memory Explorer,
  `docs/09-ui/memory-explorer.md`) rather than only to internal
  monitoring, so storage-driven retention decisions are informed.

## Alerting and surfacing

Monitoring signals surface through the Tray icon's status indicator
(`docs/09-ui/tray.md`) for anything requiring user attention (a
persistently degraded service, a stuck task blocking user-visible
progress) — monitoring exists to inform the user and enable timely
intervention, not merely to populate an internal dashboard no one is
expected to check proactively.

## Self-monitoring cannot mask its own failure

Per the "who monitors the monitor" concern raised during this project's
foundational review, the monitoring subsystem's own health is itself
tracked by Runtime Manager using the same heartbeat mechanism applied to
every other service (`docs/03-runtime/runtime-manager.md`) — there is no
special-cased, unmonitored monitoring service; if it stops reporting
heartbeats, it is restarted exactly as any other degraded service would
be.

## Relationship to performance benchmarking

Continuous monitoring data feeds the historical tracking described in
`docs/11-performance/benchmarks.md` and `docs/12-testing/benchmarks.md` —
production monitoring and pre-release benchmark testing draw from
compatible instrumentation, rather than maintaining separate,
inconsistent measurement approaches for development versus production
use.

## Related documents

- `docs/25-failure-modes/FM-17-observability.md` — failure modes for this subsystem
- `docs/03-runtime/runtime-manager.md` — the heartbeat mechanism this
  monitoring relies on and is itself subject to
- `docs/11-performance/resource-usage.md` — the budgets monitored against
- `docs/09-ui/tray.md` — the primary user-facing surface for monitoring
  alerts
- `docs/26-system-reference/22-metrics-catalog.md` — the stable, named
  metrics this monitoring is built from
