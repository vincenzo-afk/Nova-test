# Public SDK

## Purpose

Defines the public, third-party-facing SDK that lets external
applications and scripts interact with a running NOVA instance —
submitting tasks, querying memory, and building custom tool integrations
— consistent with the "public SDK, REST, WebSocket, MCP Server, Plugin
SDK" integration commitment established for this project.

## Scope

SDK surface and its relationship to the REST/WebSocket APIs underneath
it. Wire-level schemas are `schemas.md`.

## SDK as a wrapper over REST/WebSocket

The SDK does not define a separate protocol — it is a typed, ergonomic
client library wrapping the REST API (`rest-api.md`) for request/response
operations and the WebSocket API (`websocket.md`) for streaming task
progress, so that SDK consumers and direct REST/WebSocket consumers are
guaranteed to see identical underlying behavior.

## Core SDK capabilities

- Submit a task and await its result, or subscribe to streaming progress.
- Query Memory and the Knowledge Graph via the same Retrieval Fusion
  Engine (`docs/04-memory/retrieval-engine.md`) the Planner itself uses.
- Register a custom tool (a Plugin, in the terms of
  `docs/06-tools/tool-registry.md`) that becomes available to the Tool
  Registry, subject to the same `docs/06-tools/tool-interface.md`
  contract every built-in tool satisfies.
- Query permission and confirmation status for tasks the SDK consumer has
  submitted.

## Authentication

SDK connections authenticate against the local NOVA instance using a
locally-issued token, scoped to the OS user session
(`docs/10-security/authentication.md`) — there is no cloud-mediated SDK
authentication, consistent with NOVA's local-first, no-hosted-backend
scope (`docs/00-overview/non-goals.md`).

## Plugin tools are not automatically trusted

A tool registered via the SDK's plugin mechanism is subject to the exact
same Permission Manager gating and risk-tier classification as any
built-in tool (`docs/03-runtime/permission-manager.md`) — SDK-registered
tools receive no elevated trust merely for being registered through this
path, and a plugin declaring no verification signal is restricted to
confirmation-required execution exactly as any other under-specified
tool would be (`docs/06-tools/tool-interface.md`).

## Related documents

- `docs/25-failure-modes/FM-27-external-api-surface.md` — failure modes for this subsystem
- `rest-api.md`, `websocket.md` — the underlying protocols this SDK wraps
- `docs/06-tools/tool-registry.md`, `tool-interface.md` — the plugin tool
  registration contract
- `docs/10-security/authentication.md` — SDK authentication mechanics
