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

A client establishes `ws://127.0.0.1:<port>/v1/events` and authenticates with
the same local bearer token mechanism as the REST API
(`docs/10-security/authentication.md`). The bearer token is sent in the
WebSocket handshake's `Authorization` header. An unauthenticated handshake
is rejected with HTTP 401 before the connection is upgraded.

After the connection opens, the client sends JSON command frames. A client
establishes one WebSocket connection and subscribes to one or more topics
scoped to tasks or entities it has permission to observe.

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

## Command and replay frames

Subscription commands use these shapes:

```json
{ "action": "subscribe", "topics": ["task.progress"] }
{ "action": "unsubscribe", "topics": ["task.progress"] }
```

The server acknowledges each command with a corresponding `subscribed` or
`unsubscribed` frame. A replay request uses one cursor:

```json
{ "action": "replay", "from_message_id": "<message-id>" }
```

or an ISO timestamp using `from_timestamp`. Replay is limited to the topics
currently subscribed by the authenticated session. Task-progress events
support replay; ephemeral system-status events may have no journaled history.

## Message delivery

At-least-once delivery per topic, consistent with the internal
Communication Bus's own delivery model
(`docs/02-architecture/communication-model.md`) — external WebSocket
consumers are expected to handle duplicate `message_id`s idempotently,
exactly as internal service consumers are.

## Reconnection and missed-message handling

On reconnection after a dropped connection, a subscriber can request replay
from a specific `message_id` or timestamp for topics that support it, so that a
brief network interruption does not silently lose task-completion
notifications. The runtime event journal retains a bounded history and
forwards events published through the CommunicationBus event journal to live
subscribers.

## Backpressure

A slow consumer that cannot keep up with its subscribed topics is closed with
WebSocket code 1013 after the configured buffered-byte threshold is exceeded,
and receives a typed `NOVA-EVT002` buffer-limit error when the server can send
it. This is subject to the same overflow policy described in
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
