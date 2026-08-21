# Caching

## Purpose

Describes what is cached, where, and how cache invalidation is handled —
particularly for the State Manager's "current truth" resolution, which is
the system's most cache-invalidation-sensitive component given how
quickly desktop state can change.

## Scope

Caching strategy across the system. State Manager's specific conflict-
resolution logic is `docs/03-runtime/state-manager.md`; this document
covers caching as a performance mechanism broadly.

## What is cached

- **World Model state** — the current desktop state
  (`docs/03-runtime/world-model.md`) is itself an in-memory cache,
  continuously updated from Observer events rather than queried fresh
  from the OS on every request, which is what keeps focus/window checks
  fast enough for the automation pre-action validation latency budget.
- **Frequently retrieved Knowledge Graph subgraphs** — a small cache of
  recently and frequently traversed graph regions (e.g., the currently
  active project's immediate neighborhood) to avoid re-traversing the
  same relationships on every Context Builder call within a single task.
- **Model Router decisions** — for a given combination of task type,
  constraints, and current provider availability, the routing decision is
  cached briefly to avoid re-running the full filter/rank algorithm on
  every single call within a short time window, invalidated immediately
  on any provider availability change.

## Cache invalidation rule

The governing rule, established for State Manager and applied
consistently wherever caching appears elsewhere in the system: **the
latest verified observation always invalidates a stale cached value**,
never the reverse. A cache is a performance optimization over the
authoritative source, never itself treated as more current than a fresh,
verified signal when the two conflict.

## World Model cache staleness handling

Per `docs/03-runtime/world-model.md`, a cached World Model entry not
refreshed within its configured maximum age is treated as unconfirmed
rather than relied upon directly — this is the specific mechanism
protecting against the "cached state used past its useful freshness
window" failure mode for any cache in the system, not just the World
Model.

## What is deliberately not cached

Verification outcomes (`docs/03-runtime/verifier.md`) are never cached or
reused across different action invocations — every action's success is
independently verified, since a cached "this succeeded last time" signal
would directly contradict the ground-truth-first verification principle.

## Related documents

- `docs/25-failure-modes/FM-14-files-storage-documents-cache.md` — failure modes for this subsystem
- `docs/03-runtime/world-model.md`, `state-manager.md` — the primary
  caching-and-invalidation implementation
- `docs/05-ai/model-router.md` — the routing-decision cache described
  above
- `scalability.md` — how caching contributes to overall scaling behavior
