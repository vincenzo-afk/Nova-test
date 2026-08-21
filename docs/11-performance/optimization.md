# Optimization

## Purpose

Describes NOVA's primary performance optimization strategy: avoiding
expensive work rather than making expensive work faster. This document
ties the Deterministic Before Intelligent principle directly to
performance engineering, since it is the single largest lever available.

## Scope

Cost/performance optimization strategy at the architectural level.
Component-specific optimizations (caching, indexing efficiency) are
documented in their owning components.

## Cheap-first as the primary optimization

The dominant optimization in the entire system is simply not invoking an
LLM when deterministic execution suffices
(`docs/05-ai/deterministic-first.md`). An LLM call is orders of magnitude
slower and more expensive than a native function, index lookup, or CLI
invocation — no amount of optimizing the LLM call path (caching,
batching, model selection) closes that gap, which is why this principle
is treated as the primary lever rather than one optimization among many.

## Deterministic execution priority as a secondary lever

Within the execution-priority chain itself
(`docs/06-tools/execution-priority.md`), preferring Native Runtime over
API over MCP over CLI over Accessibility over Vision is itself a
performance ordering, not just a safety ordering — each tier down the
chain is measurably slower, and the chain's safety-motivated ordering
happens to align with a performance-motivated ordering as well.

## Query-routing optimization

The Retrieval Fusion Engine (`docs/04-memory/retrieval-engine.md`)
applies the same cheap-first logic to search itself: an exact filename or
ID match short-circuits toward keyword/entity search rather than always
running semantic vector search, which is meaningfully more expensive per
query.

## Cost-aware model routing

Where an LLM call is genuinely necessary, the Model Router
(`docs/05-ai/model-router.md`) selects the lowest-cost option meeting the
required capability and latency bar, with local models preferred where
configured — this is a secondary optimization layer beneath the primary
"avoid the call entirely where possible" strategy above.

## Measuring optimization effectiveness

Per `docs/01-product/success-metrics.md`, the proportion of tasks
resolved without any LLM call is tracked directly and must not decrease
over time — this metric is the practical measure of whether this
optimization strategy is being upheld as new capability is added, rather
than degrading as convenience-driven shortcuts accumulate.

## Related documents

- `docs/25-failure-modes/FM-16-resource-management-and-performance.md` — failure modes for this subsystem
- `docs/05-ai/deterministic-first.md` — the principle underlying this
  entire strategy
- `docs/06-tools/execution-priority.md` — the tier ordering this
  optimization aligns with
- `docs/01-product/success-metrics.md` — the metric tracking this
  strategy's effectiveness over time
