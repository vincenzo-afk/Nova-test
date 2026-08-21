# IPC Mechanisms

## Purpose

States explicitly which inter-process communication mechanism is used
for each communication path in NOVA, and why alternatives (gRPC, Redis,
SQLite-as-queue) were not chosen — closing a gap where an implementer
might otherwise assume a different mechanism than the one actually
specified elsewhere in this repository.

## Scope

Which IPC mechanism applies to which communication path. The message
envelope and delivery semantics carried over these mechanisms are
`docs/02-architecture/event-bus-specification.md`.

## Mechanism per communication path

| Path | Mechanism | Specified in |
|---|---|---|
| Inter-service (Observer ↔ Memory ↔ Planner ↔ Executor, etc.) | Named pipes (local IPC) | `docs/02-architecture/communication-model.md` |
| UI Layer ↔ core services | Internal API over the same named-pipe bus, via API Gateway | `docs/08-api/internal-api.md` |
| External SDK/third-party consumer ↔ NOVA | REST (request/response) and WebSocket (streaming) | `docs/08-api/rest-api.md`, `websocket.md` |
| NOVA ↔ user-configured external webhook endpoint | Outbound HTTP POST | `docs/08-api/events.md` |
| NOVA ↔ MCP servers | MCP's own protocol: JSON-RPC over stdio (local server) or Streamable HTTP (remote server), selected deterministically per `docs/06-tools/mcp.md`'s Transport section | `docs/06-tools/mcp.md` |
| NOVA ↔ plugin processes | Same tool-invocation interface as any other tool, over a dedicated named pipe established at spawn time (never stdio, never a raw socket) per `docs/16-extensibility/plugin-sandboxing.md`'s Process communication transport section | `docs/16-extensibility/plugin-sandboxing.md` |
| Persistent storage access (Memory, Knowledge Graph) | Direct storage-engine client libraries (SQLite/Postgres driver, embedded graph database client, vector database client) — not IPC in the network sense, since these are embedded or local-process storage engines | `docs/04-memory/memory-storage.md` |

## Why not gRPC for inter-service communication

gRPC was considered and rejected for the core inter-service bus
specifically because it is fundamentally a request/response (with
streaming extensions) model, whereas NOVA's inter-service communication
is predominantly publish/subscribe over shared topics
(`docs/02-architecture/communication-model.md`) — modeling pub/sub
cleanly over gRPC would require building a topic/subscription layer on
top of it, at which point the simpler named-pipe-plus-envelope approach
already specified is less complex for a single-machine deployment with
no cross-network service calls.

## Why not Redis (or another external broker) for the event bus

Introducing an external broker process (Redis, RabbitMQ, etc.) would add
an additional installed dependency and failure domain for a single-
machine, local-first product (`docs/00-overview/non-goals.md`) where
every consumer already runs on the same machine — the complexity an
external broker solves (multi-machine fan-out, persistence across
broker restarts independent of any single consumer) is not a requirement
NOVA's current scope has, per `docs/01-product/project-scope.md`.

## Why not SQLite as a queue

Using a SQLite table as a message queue (a common lightweight pattern)
was considered for its simplicity, but was rejected in favor of the
dedicated named-pipe bus because SQLite-as-queue typically requires
polling or a supplementary notification mechanism to achieve low-latency
delivery, whereas a proper IPC transport delivers events with lower
latency and without a polling loop — relevant given the sub-100ms and
sub-20ms latency targets in `docs/11-performance/performance-goals.md`.

## Related documents

- `docs/02-architecture/communication-model.md`,
  `event-bus-specification.md` — the transport and semantics for the
  named-pipe path
- `docs/08-api/` — external-facing mechanisms
- `docs/00-overview/non-goals.md`, `docs/01-product/project-scope.md` —
  the local-first scope these choices are consistent with
