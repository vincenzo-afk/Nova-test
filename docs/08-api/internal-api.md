# Internal API

## Purpose

Describes the internal-facing API surface the UI Layer uses to
communicate with the rest of NOVA through the API Gateway — distinct from
the external-facing public SDK/REST/WebSocket surface described in
`sdk.md`, `rest-api.md`, and `websocket.md`, which are intended for
third-party or advanced-user integration.

## Scope

The internal contract between UI Layer and API Gateway. External-facing
contracts are the other documents in this folder.

## Why a separate internal API rather than reusing the public one

The UI Layer is a first-party, trusted consumer with access needs the
public API intentionally does not expose by default (e.g., direct access
to in-progress task step detail for the Task Monitor UI,
`docs/09-ui/task-monitor.md`) — collapsing both into one surface would
force a choice between over-exposing internal detail publicly or
under-serving the UI's needs. The internal API is a superset capability
surface used only by the first-party UI process.

## Core internal operations

- Submit a task request (routes to Task Manager,
  `docs/03-runtime/task-manager.md`).
- Subscribe to task state changes and step-level progress
  (backed by the same event mechanism as `websocket.md`, but with full
  step detail rather than the summarized external view).
- Query Memory and Knowledge Graph directly for the Memory Explorer and
  Graph Explorer UI surfaces (`docs/09-ui/memory-explorer.md`,
  `docs/09-ui/graph-explorer.md`).
- Query and update permission grants (`docs/10-security/permissions.md`)
  for the permission center UI.
- Submit a confirmation response for a pending Permission Manager gate
  (`docs/03-runtime/permission-manager.md`).

## Transport

Internal API calls travel over the same Communication Bus transport as
inter-service messages (`docs/02-architecture/communication-model.md`),
via the API Gateway acting as the bus-facing endpoint for the UI process,
which itself has no direct bus access per
`docs/02-architecture/system-architecture.md`'s process-isolation model.

## Versioning

Internal API versioning follows the UI Layer and API Gateway being
deployed together as part of the same release, so strict backward
compatibility across versions is not required the way it is for the
external API (`versioning.md`) — both sides update in lockstep.

## Related documents

- `docs/25-failure-modes/FM-27-external-api-surface.md` — failure modes for this subsystem
- `docs/02-architecture/system-architecture.md` — the process boundary
  this API crosses
- `docs/09-ui/` — the UI surfaces consuming this API
- `sdk.md`, `rest-api.md`, `websocket.md` — the external-facing
  counterparts
