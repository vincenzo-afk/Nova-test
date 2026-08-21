# Event Bus Specification

## Purpose

A single, clearly-named entry point consolidating the Communication
Bus/event model already specified across
`docs/02-architecture/communication-model.md` and `docs/02-architecture/event-driven-architecture.md`, plus the one gap
(TTL) neither previously addressed. This document adds one new concept
and otherwise indexes rather than restates existing content, consistent
with this repository's anti-duplication convention.

## Scope

A complete-picture index of every event bus property, each pointing to
its authoritative definition, plus TTL as new content.

## Property index

| Property | Specification | Authoritative document |
|---|---|---|
| Event schema (envelope) | `message_id`, `topic`, `schema_version`, `timestamp`, `correlation_id`, `source_service`, `payload` | `docs/02-architecture/communication-model.md` |
| Publisher/subscriber model | Publish/subscribe by topic | `docs/02-architecture/communication-model.md` |
| Delivery guarantee | At-least-once, explicitly not exactly-once or at-most-once | `docs/02-architecture/communication-model.md` |
| Ordering | Guaranteed within one topic + source service only | `docs/02-architecture/event-driven-architecture.md` |
| Retry | Consumer-level bounded retry before dead-lettering | `docs/02-architecture/communication-model.md` |
| Deduplication | By `message_id`, plus semantic debounce for observation events | `docs/02-architecture/event-driven-architecture.md` |
| Dead-letter queue | Per-topic, surfaced to monitoring | `docs/02-architecture/communication-model.md` |
| Priority | Task/system topics ahead of observation topics under backpressure, with dedicated consumer paths preventing inversion | `docs/02-architecture/event-driven-architecture.md` |
| Versioning | Semver per topic, additive changes handled gracefully | `docs/02-architecture/communication-model.md` |
| Event taxonomy | Full per-source event type list | `docs/07-observers/events.md` |

## TTL (new content)

Messages on the bus carry an implicit TTL: a message not yet delivered
after a configured maximum age (distinct from consumer-side processing
retry, which applies after delivery) is dropped rather than delivered
late — this matters specifically for observation topics, where a very
stale filesystem event (e.g., queued during an extended backpressure
episode) is less useful than the current state a fresh query would
return, and delivering it late could cause a consumer to process events
out of real-world relevance. Task and system topics have a materially
longer TTL than observation topics, consistent with the priority model
above, since a task-state update remains relevant far longer than a
single filesystem change notification.

TTL expiry is logged (feeding `docs/13-devops/monitoring.md`) and is
distinct from dead-lettering: a dead-lettered message failed processing
after delivery; a TTL-expired message was never delivered at all because
it aged out first.

## Why this document exists as an index rather than a rewrite

The properties above were already fully specified before this document
was written; consolidating them here without restating their content
avoids the exact "duplicate explanations across multiple documents"
problem flagged in this project's own documentation-quality review.
Where this repository's other documents reference "the event bus," they
must be understood to mean the specification indexed here.

## Related documents

- `docs/02-architecture/communication-model.md`,
  `event-driven-architecture.md` — the authoritative content this index
  points to
- `docs/07-observers/events.md` — the concrete event taxonomy
- `docs/13-devops/monitoring.md` — where TTL expiry and dead-letter
  events are surfaced
