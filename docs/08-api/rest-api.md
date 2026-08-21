# REST API

## Purpose

Defines the request/response HTTP interface for submitting tasks,
querying memory, and managing configuration — the foundation the SDK
(`sdk.md`) wraps and the counterpart to the streaming WebSocket API
(`websocket.md`) for operations that do not need continuous updates.

## Scope

Endpoint categories and request/response conventions. Wire-level schemas
are `schemas.md`; versioning policy is `versioning.md`.

## Endpoint categories

- **Tasks** — submit a task, query task status/result, cancel a task
  (mapping to Task Manager, `docs/03-runtime/task-manager.md`).
- **Memory and search** — query the Retrieval Fusion Engine
  (`docs/04-memory/retrieval-engine.md`) with the same query interface
  the internal Search feature (`docs/04-memory/search.md`) uses.
- **Knowledge Graph** — direct entity and relationship queries
  (`docs/04-memory/knowledge-graph.md`).
- **Tools** — list registered tools and their metadata
  (`docs/06-tools/tool-registry.md`), and register new plugin tools
  (subject to `sdk.md`'s trust model).
- **Permissions** — query and update observer/execution permission
  grants (`docs/10-security/permissions.md`).
- **Configuration** — provider configuration (`docs/05-ai/model-providers.md`), cost budgets, and other user-configurable
  settings.

## Request/response conventions

All endpoints accept and return JSON. Every response includes a
`correlation_id` where applicable (for task-related endpoints), matching
the internal message envelope's field of the same name
(`docs/02-architecture/communication-model.md`), so that a REST-submitted
task's `correlation_id` can be cross-referenced directly against the
audit trail (`docs/10-security/audit.md`).

## Synchronous vs. asynchronous task submission

Task submission always returns immediately with a task ID and initial
state — there is no long-blocking synchronous "wait for completion"
endpoint, since task duration is inherently variable
(`docs/03-runtime/planner.md`'s step/time budgets). Callers needing
completion notification use either polling against the status endpoint
or the WebSocket API (`websocket.md`) for push-based updates.

## Rate limiting

External REST API calls are subject to a configurable rate limit per
authenticated client, independent of the AI-provider rate limits tracked
in `docs/05-ai/model-providers.md` — this protects the local NOVA
instance's own resource budget (`docs/11-performance/resource-usage.md`,
Tier 3) from being exhausted by an external integration's call volume.

## Related documents

- `docs/25-failure-modes/FM-27-external-api-surface.md` — failure modes for this subsystem
- `sdk.md` — the client library wrapping this API
- `websocket.md` — the streaming counterpart
- `schemas.md` — full request/response schemas
- `versioning.md` — API versioning and deprecation policy
- `endpoint-catalog.md` — the literal, enumerated method+path list for every endpoint category above
- `pagination.md` — pagination scheme for list endpoints
