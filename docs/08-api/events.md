# External Event Subscriptions

## Purpose

Describes the external-facing event/webhook mechanism for API consumers
who want push notifications without maintaining an open WebSocket
connection — distinct from `docs/07-observers/events.md`, which is the
internal observer event taxonomy, and distinct from the WebSocket API
(`websocket.md`), which is for consumers that do want a persistent
connection.

## Scope

Webhook-style external event delivery. The event *sources* being
surfaced here are the same underlying task/system events described
elsewhere; this document covers the delivery mechanism for consumers
preferring callbacks over an open connection.

## Webhook registration

An external API consumer registers a callback URL and a set of topics
(mirroring the WebSocket API's subscribable topics in `websocket.md`) via
the REST API (`rest-api.md`). NOVA delivers matching events as HTTP POST
requests to that URL.

## Delivery guarantees

At-least-once, with retry and exponential backoff on delivery failure, up
to a configurable maximum attempt count — after which the event is
dropped and logged, and the registered webhook is flagged for the
consumer's own health check rather than retried indefinitely.

## Security

Webhook payloads are signed using a per-registration secret so the
receiving endpoint can verify the event genuinely originated from the
local NOVA instance — this matters specifically because a webhook target
may be a network-reachable service, unlike the fundamentally local-only
WebSocket and REST connections, and it is the one place in this API
surface where NOVA initiates an outbound network call to a
user-configured external destination.

## Relationship to local-first scope

Webhook delivery is opt-in and requires an explicit external URL
configured by the user — it does not conflict with the local-first,
no-hosted-backend stance in `docs/00-overview/non-goals.md`, since NOVA
itself still does not operate any backend; it simply calls out to a
destination the user has explicitly configured, the same way any local
application with a "notify my webhook" feature would.

## Related documents

- `docs/25-failure-modes/FM-27-external-api-surface.md` — failure modes for this subsystem
- `websocket.md` — the persistent-connection alternative to this
  mechanism
- `rest-api.md` — where webhook registration happens
- `docs/07-observers/events.md` — the internal event taxonomy some of
  these external topics are derived from
