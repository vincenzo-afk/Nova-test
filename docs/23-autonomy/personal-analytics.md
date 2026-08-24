# Personal Analytics

## Purpose

Specifies the "what did I do this month" capability: structured
rollups of the user's own activity, derived from NOVA's existing
observation and memory architecture rather than a new tracking system.

## Scope

Analytics views and their data sources. This document does not introduce
new data collection — it defines aggregation and presentation over data
already captured under `docs/04-memory/memory-architecture.md` and `docs/07-observers/`.

## Data sources

- Observer streams already collected (applications used, files touched,
  browser activity, notifications) per `docs/07-observers/`.
- Task history from the Task Manager (`docs/03-runtime/task-manager.md`).
- Provider usage/cost logs from
  `docs/18-providers/cloud-provider-management.md` and `docs/18-providers/provider-routing.md`'s observability log.
- Calendar and email activity, where those capabilities are connected
  (`docs/21-channels/`).

## Views

- **Time allocation** — time spent per application/project/domain over a
  selected period, derived from existing observer data, not a new
  screen-time tracker.
- **Task summary** — completed, in-progress, and abandoned NOVA-assisted
  tasks over a period.
- **Provider/cost usage** — which capabilities and providers were used,
  how often, and at what cost, feeding the same view
  `cloud-provider-management.md` uses for budget tracking.
- **Communication summary** — volume and topics (not full content
  reproduction) across connected channels/email, useful for a "what did I
  discuss this month" query.

## Privacy posture

Personal analytics operates entirely over the user's own local (or
synced-per-`cross-device-memory.md`) data. It is never transmitted
anywhere as a NOVA-operated aggregate — there is no cross-user analytics
or telemetry rollup, consistent with the "not a hosted multi-tenant
service" non-goal. Any view that would otherwise surface raw sensitive
memory content is subject to the same confidence/attribution handling as
`docs/04-memory/memory-confidence.md`.

The runtime `PersonalAnalytics` boundary consumes existing, already
permissioned records supplied by its caller; it does not start a new
observer, screen-time tracker, communication reader, or telemetry stream.
Reports use a half-open UTC period (`from <= timestamp < to`) and produce
only bounded aggregates: time allocation by domain/label, task outcome
counts, provider request/cost totals, and communication volume by
channel/topic. Raw task goals, message bodies, email contents, prompts,
transcripts, file names, credentials, and provider responses are not copied
into the report diagnostics. The local `analytics.report.generated` event
contains only period boundaries, aggregate counts, and numeric totals.
Invalid timestamps and negative/non-finite numeric measurements are ignored
rather than allowed to corrupt a report.

## Relationship to adaptive personalization

Personal analytics is descriptive (what happened); it is the primary
data feed for `adaptive-personalization.md`'s prescriptive layer
(adjusting NOVA's own defaults based on what happened) — the two are
related but distinct: analytics can be viewed with adaptive behavior
fully disabled.

## Related documents

- `docs/25-failure-modes/FM-22-user-interaction-and-analytics.md` — failure modes for this subsystem
- `docs/04-memory/memory-architecture.md`, `docs/07-observers/` —
  underlying data sources
- `docs/18-providers/cloud-provider-management.md` — cost data source
- `adaptive-personalization.md` — the behavior-adjustment layer built on
  this data
