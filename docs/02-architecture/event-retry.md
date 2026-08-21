# Event Retry

## Purpose

Consumer-level retry semantics specifically for the Event Bus
(`docs/02-architecture/event-bus-specification.md`,
`communication-model.md`) — those documents establish at-least-once
delivery and consumer-level bounded retry before dead-lettering
qualitatively, but never pinned down which retry policy actually
applies. This file closes that gap by confirming the event bus uses the
system-wide default rather than a bespoke one, and adds the event-bus-
specific details (poison-message handling, per-topic override) that
default doesn't cover.

## Scope

Event-bus consumer retry only. The system-wide default retry policy
itself (max retries, backoff curve, jitter) is canonical in
`docs/26-system-reference/19-ordering-concurrency-and-retry-rules.md`
and is not restated here.

## The event bus uses the system-wide default

Unless a specific topic's contract states otherwise, a consumer that
fails to process a message retries using
`19-ordering-concurrency-and-retry-rules.md`'s default policy: 3 max
retries, exponential backoff (500ms base, 2x multiplier, ±20% jitter).
This is the same policy applied to provider calls and tool execution —
the event bus is not a special case requiring its own numbers.

## What is bus-specific

- **Redelivery vs. reprocessing:** a retry redelivers the same message
  to the same consumer group; it does not republish a new message with a
  new `event_id`. A dead-lettered message therefore keeps its original
  `event_id` for correlation back to whatever produced it.
- **Poison-message handling:** if the same message fails identically
  across all 3 attempts (not merely a transient condition clearing), the
  consumer marks it as a poison message in the dead-letter entry,
  distinct from a message that dead-lettered due to exhausted transient
  retries — this distinction is what lets an operator triage "the
  consumer has a bug" separately from "the downstream dependency was
  briefly down," per `docs/13-devops/monitoring.md`'s incident-response
  framing.
- **Per-topic override:** a topic may declare a different max-retry
  count in its own event-catalog entry (`docs/26-system-reference/
  07-event-catalog.md`) when its failure mode genuinely differs (e.g., a
  topic feeding a circuit-breaker-protected provider call inherits that
  breaker's own retry shape instead) — but this must be an explicit,
  documented override, never a silent per-topic divergence.
- **No retry across a bus restart:** an in-flight retry count is not
  persisted across a Communication Bus restart; a message redelivered
  after restart begins a fresh retry count, since the failure that
  caused the original retries may no longer apply post-restart.

## Related documents

- `docs/26-system-reference/19-ordering-concurrency-and-retry-rules.md` — the system-wide default retry policy this file reuses
- `docs/02-architecture/communication-model.md` — at-least-once delivery and dead-letter routing
- `docs/02-architecture/event-bus-specification.md` — the bus this retry policy applies to
- `docs/26-system-reference/07-event-catalog.md` — where a per-topic override would be declared
- `docs/13-devops/monitoring.md` — dead-letter surfacing for operator triage
