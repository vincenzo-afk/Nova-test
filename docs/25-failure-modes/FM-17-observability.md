# FM-17: Observability (Logging, Metrics, Tracing)

## Purpose

Failures in NOVA's ability to see itself. This category is uniquely dangerous because its failures make every other category's failures harder to detect and diagnose — observability gaps compound silently.

## Scope & Related Documents

This file is part of `docs/25-failure-modes/`, the project-wide failure-mode catalog. It must be read alongside:

- `docs/13-devops/logging.md` - `docs/13-devops/monitoring.md` - `docs/26-system-reference/22-metrics-catalog.md`

## Failure Catalog

Each failure is assigned a stable ID (`FM-17-0XX`) for cross-referencing from code comments, incident reports, and other failure-mode files.

| ID | Failure | Trigger Condition | Detection | Severity | Mitigation (prevent) | Recovery (respond) |
|---|---|---|---|---|---|---|
| **FM-17-001** | Missing logs | A code path that should log doesn't, due to a missing statement or a logger misconfiguration that silently drops entries. | Log-coverage audit against critical code paths finds gaps; or an incident post-mortem finds no corresponding log entry for a known event. | Medium | Mandatory logging at defined checkpoints (task state transitions, tool calls, errors) enforced by code review/lint, not left to individual discretion. | Backfill logging for the identified gap; cannot recover the missing historical data, which is itself the argument for closing gaps proactively. |
| **FM-17-002** | Wrong timestamps | Log timestamps use local time inconsistently, or clock skew across components makes correlated events appear out of order. | Cross-component log correlation shows causally-impossible orderings. | Medium | UTC timestamps everywhere in logs, consistent with `docs/00-overview/time-semantics.md`; NTP-synced clocks across all NOVA instances. | Reprocess/re-correlate logs using logical ordering where available, since raw timestamps may be untrustworthy for the affected window. |
| **FM-17-003** | Missing metrics | A component doesn't emit a metric needed to detect a specific failure mode described elsewhere in this document. | A specific failure category's stated 'Detection' method has no corresponding metric actually implemented. | Medium | Treat each failure-mode document's Detection column as a metrics-implementation checklist, reviewed during implementation, not just documented aspirationally. | Implement the missing metric; until then, that specific failure mode has no automated detection and needs manual/periodic review as a stopgap. |
| **FM-17-004** | Incorrect traces | Distributed trace spans don't correctly nest/link across service boundaries, breaking end-to-end request visibility. | Trace visualization shows disconnected or malformed span trees for a known multi-service request. | Medium | Consistent trace-context propagation (correlation IDs) across every service boundary and async boundary, including event-bus hops. | Fix the specific propagation gap; for incidents that already occurred, fall back to correlating by timestamp+request-ID across separate logs. |
| **FM-17-005** | Silent failures | An error occurs and is caught, but neither logged, surfaced, nor retried — it simply disappears. | Discrepancy between expected and actual system state with zero corresponding log/alert (found via reconciliation audits, not real-time detection). | Critical | Ban bare except/catch blocks that don't log or re-raise, enforced by lint/code review; every caught error must be observable somewhere. | Add logging at the swallowed catch site; audit for other instances of the same anti-pattern nearby, since silent failures tend to cluster. |
| **FM-17-006** | Log overflow | Log volume exceeds storage/processing capacity, causing rotation to drop recent entries or the logging pipeline itself to fail. | Log-ingestion pipeline reports drops, or disk usage from logs crosses a threshold. | Medium | Log-level discipline (avoid debug-level logging in production hot paths) and volume-based alerting before rotation starts dropping needed data. | Increase retention/rotation capacity for the affected window if possible; reduce noisy log sources going forward. |
| **FM-17-007** | Telemetry dropped | Metrics/traces sent to a collector are lost in transit (network issue, collector overload) without the sender knowing. | Gap in the metrics time-series with no corresponding outage in the actual service. | Medium | Buffer telemetry locally with retry-on-failure rather than fire-and-forget; monitor the telemetry pipeline's own health as a first-class service. | Backfill from local buffers if retained; otherwise treat the gap as a known blind spot for that time window during incident review. |

## Compounding Failures

Notes on how failures in this file interact with failures elsewhere in this catalog — read these before assuming a bug is isolated to one subsystem.

- Silent failures (FM-17-005) are the meta-risk of this entire failure-mode document: any category above whose 'Detection' column relies on a log or metric that itself isn't being captured degrades into a silent failure. Observability coverage must be audited against this document's own detection-method column periodically.

## Severity Legend

- **Critical** — data loss, security compromise, or user-visible harm; requires an incident-response runbook, not just a bug ticket.
- **High** — silent incorrectness, significant user-visible breakage, or a failure that blocks task completion with no graceful degradation.
- **Medium** — degraded quality/UX or a failure with a working but imperfect fallback.
- **Low** — cosmetic, rare, or fully recoverable with negligible user impact.
