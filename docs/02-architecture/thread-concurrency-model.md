# Thread and Concurrency Model

## Purpose

Specifies the concurrency model for each major component — which are
single-threaded, multi-threaded, actor-based, event-driven, or worker-
pool-based — so an implementer does not have to infer this from the
architectural description alone.

## Scope

Per-component concurrency model. Cross-service concurrency (multiple
tasks, resource locking) is `docs/11-performance/concurrency.md`; this
document is about the internal threading model within a single service
process.

## Per-component model

| Component | Model | Rationale |
|---|---|---|
| Runtime Manager (`docs/03-runtime/runtime-manager.md`) | Single-threaded, event-driven | Simplicity is paramount for the one component everything else depends on being correct; no concurrency bugs are acceptable here |
| Observer services (`docs/07-observers/`) | Event-driven, one event loop per observer source | Each source's OS event subscription is inherently async; sources are isolated from each other for failure containment (`docs/10-security/sandboxing.md`) |
| Memory / Knowledge Graph (`docs/04-memory/`) | Worker pool for indexing/embedding generation, single-writer for storage mutation | Read-heavy, write-serialized — concurrent reads need no coordination; writes are serialized per `docs/04-memory/knowledge-graph.md`'s consistency guarantee |
| Planner (`docs/03-runtime/planner.md`) | Actor-per-task-instance | Each task's planning loop is logically independent; modeling each as an actor with its own mailbox avoids shared mutable state between concurrently planning tasks |
| Executor (`docs/03-runtime/executor.md`) | Worker pool, bounded by Scheduler's concurrency limit | Tool invocations are I/O-bound (file operations, network calls); a worker pool avoids blocking on one slow invocation while another could proceed |
| Model Router / Reasoning Engine (`docs/05-ai/`) | Async, non-blocking | LLM calls are network I/O; async avoids dedicating a full thread to a waiting call |
| Resource Manager (`docs/03-runtime/resource-manager.md`) | Single-threaded lock table | Lock acquisition/release must be strictly serialized to avoid races in the lock table itself; this is intentionally the one place a single global lock on the lock table itself is acceptable, since lock operations are fast |
| API Gateway (`docs/08-api/internal-api.md`) | Worker pool (one per connection/request) | Standard request-handling concurrency model for a request/response and WebSocket-serving component |
| Plugin processes (`docs/16-extensibility/plugin-sandboxing.md`) | Opaque to NOVA — each plugin's own process, own model | NOVA does not assume or require anything about a plugin's internal concurrency; it only requires the plugin's *external* tool-invocation interface behave per `docs/06-tools/tool-interface.md`, regardless of internal implementation |

## Cross-cutting rule: no shared mutable state without an owner

Per `docs/00-overview/ownership-boundaries.md`, any state shared across
threads or actors within a service is owned by exactly one component
responsible for synchronizing access to it — this repository does not
permit ad hoc shared-state access patterns where two threads within the
same service both directly mutate a data structure without a designated
owner mediating access.

## Actor mailbox and backpressure

For actor-modeled components (Planner instances), a mailbox that grows
unbounded indicates the actor is not keeping up — this is treated the
same as Communication Bus backpressure
(`docs/02-architecture/event-bus-specification.md`): a bounded mailbox
with an overflow policy, not an unbounded queue that could exhaust
memory under sustained load.

## Related documents

- `docs/11-performance/concurrency.md` — cross-service concurrency
  (multiple tasks, resource locking), a different axis from this
  document's per-component internal threading model
- `docs/10-security/sandboxing.md` — the process isolation that makes
  per-observer and per-plugin concurrency models independent of each
  other
- `docs/00-overview/ownership-boundaries.md` — the ownership rule shared
  mutable state must respect
