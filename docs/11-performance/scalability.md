# Scalability

## Purpose

Describes how NOVA sustains the latency targets in `performance-goals.md`
as memory volume, Knowledge Graph size, and concurrent task count grow
over months and years of continuous single-machine use — replacing the
circular "scaling means handling more without degrading" definition that
this project's foundational review flagged as insufficient, with the
actual mechanisms that achieve it.

## Scope

Scaling mechanisms for memory/graph growth and concurrent load. Caching
specifics are `caching.md`; concurrency limits are `concurrency.md`.

## Memory and Knowledge Graph growth

Each independently-scaling factor from `docs/00-overview/architecture-summary.md`'s service list is addressed as follows:

- **Memory volume** — tiered storage (`docs/04-memory/memory-architecture.md`) keeps the actively-queried Working/Recent Memory
  small and fast regardless of how much Long-term Memory/Archive has
  accumulated; retrieval queries against Archive are explicitly excluded
  from default context assembly (`docs/05-ai/context-builder.md`) so
  Archive size does not affect everyday query latency at all.
- **Knowledge Graph size** — indexed for entity, relationship, semantic,
  and temporal retrieval (`docs/04-memory/knowledge-graph.md`); the fixed
  ontology (`docs/04-memory/ontology.md`) keeps query patterns
  predictable and indexable in ways an unbounded, ever-changing schema
  would not allow.
- **Observation volume** — event-storm coalescing and batching
  (`docs/02-architecture/event-driven-architecture.md`) prevent a single
  high-volume operation (a large git clone) from producing a
  proportionally large indexing burden.

## Concurrent task and tool count

- **More concurrent tasks** — bounded by the Scheduler's configurable
  concurrency limit (`docs/03-runtime/scheduler.md`), which is itself
  derived from the resource budget in `resource-usage.md` rather than
  allowed to grow unbounded with demand.
- **More registered tools** — the Tool Registry's lookup
  (`docs/06-tools/tool-registry.md`) is indexed by intent/capability and
  execution tier, so lookup cost does not grow linearly with the total
  number of registered tools as new integrations are added over time.

## Why single-machine scaling is the relevant concern, not multi-tenant
scaling

Per `docs/01-product/project-scope.md`, NOVA is single-user, single-
machine for v1 — "scaling" here means sustaining performance as one
user's own history and workspace grow over years, not serving concurrent
independent users. Multi-device or multi-tenant scaling concerns are
explicitly deferred to Phase 5 (`docs/00-overview/non-goals.md`) and are
out of scope for this document.

## Related documents

- `docs/25-failure-modes/FM-16-resource-management-and-performance.md` — failure modes for this subsystem
- `docs/04-memory/memory-architecture.md`, `ontology.md` — the tiering
  and schema decisions this scaling model depends on
- `caching.md`, `concurrency.md` — complementary scaling mechanisms
- `resource-usage.md` — the resource ceiling scaling decisions respect
