# Communication Model

## Purpose

Defines exactly how services exchange information: transport, message
envelope, delivery guarantees, and versioning. This is the contract every
service implementation must honor to remain interoperable with the rest of
the system.

## Scope

Inter-service communication only. Communication between the UI process and
the API Gateway follows the same envelope but is additionally documented
in `docs/08-api/` (Tier 3) for the external-facing contract.

## Transport

Local IPC over named pipes, one logical Communication Bus shared by all
supervised service processes (see `system-architecture.md`). No service
holds a direct reference or connection to another service's process — all
communication addresses a topic on the bus, not a destination service.

## Message envelope

Every message on the bus carries:

```json
{
  "message_id": "uuid",
  "topic": "string (e.g. observer.filesystem.file_created)",
  "schema_version": "semver string",
  "timestamp": "ISO 8601",
  "correlation_id": "uuid (links a message to the task/request that caused it)",
  "source_service": "string",
  "payload": { "...topic-specific structured data..." }
}
```

`correlation_id` is mandatory on every message. It is what allows the
audit trail (`docs/10-security/audit.md`, Tier 3) to reconstruct a full
causal chain from a user request through every event, plan step, tool
call, and verification result it produced.

## Delivery model

Publish/subscribe by topic, **at-least-once delivery, explicitly not
exactly-once and not at-most-once** — this is a deliberate choice, stated
explicitly here because it has consequences every consumer must design
for: a message may be delivered more than once (never zero times for a
successfully published message, and never guaranteed to be delivered
exactly once). Consumers are responsible for idempotency using
`message_id` — a duplicate delivery of the same `message_id` must not be
double-processed. This is a deliberate trade-off: at-least-once with
consumer-side deduplication is simpler to reason about under process
restarts than exactly-once delivery, and every consumer already needs
idempotent handling for restart-recovery regardless (see
`docs/02-architecture/lifecycle.md`).

## Dead-letter handling

A message that fails processing repeatedly (exceeding a configured
retry count at the consumer level) is moved to a per-topic dead-letter
queue rather than being retried indefinitely or silently dropped. A
dead-lettered message is surfaced to monitoring
(`docs/13-devops/monitoring.md`) and is retained for inspection —
consistent with the Internal failure category in
`docs/03-runtime/failure-recovery.md`'s taxonomy, since a message that
cannot be processed after reasonable retry usually indicates a defect
worth investigating, not a transient condition to keep retrying forever.

## Request/response pattern

For synchronous-feeling interactions (e.g., Task Manager asking State
Manager for current truth), the requester publishes a message with a
`reply_to` topic unique to that request, and the responder publishes its
answer there. This keeps the same pub/sub transport for both event-style
and request/response-style interactions rather than maintaining two
transport mechanisms.

## Schema versioning

`schema_version` follows semver per topic. A service may only reject a
message on major-version mismatch; minor and patch differences must be
handled gracefully (unknown fields ignored, missing optional fields
defaulted). This allows one service to be updated independently of others
without a coordinated simultaneous deployment, consistent with the
modular-services rationale in `docs/02-architecture/system-architecture.md`.

## Backpressure and overflow

Per-topic queue depth limits are enforced at the bus level. When a topic
exceeds its limit (see `docs/02-architecture/event-driven-architecture.md`
for the event-storm handling this protects against), new messages on that
topic are batched or dropped according to the topic's configured overflow
policy, never silently blocking the publisher indefinitely.

## Related documents

- `event-driven-architecture.md` — event types and ordering guarantees
  built on top of this transport
- `system-architecture.md` — where the bus sits in the process topology
- `docs/03-runtime/state-manager.md` — the primary consumer of the
  request/response pattern described above
- `event-retry.md` — which retry policy applies to consumer failures, and the bus-specific details this document doesn't cover
