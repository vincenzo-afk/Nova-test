# WebSocket API

## Purpose

Defines the real-time, streaming interface for subscribing to task
progress and system events — used wherever a request/response REST call
(`rest-api.md`) would require inefficient polling, particularly for
long-running autonomous tasks.

## Scope

WebSocket connection lifecycle and subscription model. Message schemas
are `schemas.md`.

## Connection model

A client establishes one WebSocket connection and subscribes to one or
more topics scoped to tasks or entities it has permission to observe —
authenticated using the same token mechanism as the REST API
(`docs/10-security/authentication.md`).

## Subscribable topics

- **Task progress** — step-by-step updates for a specific task the
  subscriber submitted or has permission to observe, mirroring the
  external-facing summarized view of what the UI Layer's internal API
  (`internal-api.md`) receives in full detail.
- **System status** — high-level service health changes
  (degraded/recovered), useful for external monitoring integrations.
- **Memory/Knowledge Graph change notifications** — for a subscriber
  building a live-updating external view (e.g., a custom dashboard),
  scoped to specific entity types or projects.

## Message delivery

At-least-once delivery per topic, consistent with the internal
Communication Bus's own delivery model
(`docs/02-architecture/communication-model.md`) — external WebSocket
consumers are expected to handle duplicate `message_id`s idempotently,
exactly as internal service consumers are.

## Reconnection and missed-message handling

On reconnection after a dropped connection, a subscriber can request
replay from a specific `message_id` or timestamp for topics that support
it (task progress does; ephemeral system-status pings do not), so that a
brief network interruption does not silently lose task-completion
notifications.

## Backpressure

A slow consumer that cannot keep up with its subscribed topics is subject
to the same overflow policy described in
`docs/02-architecture/communication-model.md` — the server does not block
indefinitely waiting for a slow external consumer, and a consumer that
falls too far behind is notified that it has missed messages and should
reconcile via the REST API rather than assuming it received a complete
stream.

## Related documents

- `docs/25-failure-modes/FM-27-external-api-surface.md` — failure modes for this subsystem
- `rest-api.md` — the request/response counterpart to this streaming API
- `internal-api.md` — the internal, fuller-detail equivalent used by the
  UI Layer
- `docs/02-architecture/communication-model.md` — the delivery model this
  API mirrors externally
