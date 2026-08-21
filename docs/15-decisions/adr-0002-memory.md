# ADR-0002: Memory Architecture

## Status
Accepted

## Context

The original concept described five conceptual memory types (raw,
normal, tree/graph, timeline, entity) with no storage technology, no
retention policy, and no defined ontology ownership for the knowledge
graph. The foundational review flagged two specific risks: unbounded raw
memory growth with no forgetting policy, and knowledge-graph schema drift
from allowing the model to invent new relationship types over time.

## Decision

Memory is organized into four tiers — Working, Recent, Long-term, and
Archive — plus a separate, fixed-schema Knowledge Graph populated from
the tiers via entity resolution. Storage is hybrid: structured stores
(SQLite/Postgres) for metadata, a vector database for embeddings, a
dedicated graph database for the Knowledge Graph, and blob storage for
raw artifacts, all encrypted at rest uniformly. The Knowledge Graph
ontology is fixed and versioned; the system defines it, and the model may
only instantiate nodes/relationships against the existing schema, never
invent new types at runtime. Raw memory is explicitly not retained
indefinitely — it is promoted, summarized, or archived per a defined
lifecycle, with user-controlled deletion by time range always available.

## Alternatives Considered

- **A single undifferentiated memory store** — rejected because it
  cannot distinguish current-and-confident facts from stale-or-unverified
  ones without re-deriving that distinction on every query.
- **A fully schema-flexible, LLM-extensible knowledge graph** — rejected
  directly in response to the review's schema-drift finding; the fixed-
  schema-plus-review-queue model was chosen instead to keep query
  correctness stable over years of use.
- **Unbounded raw retention "for completeness"** — rejected because it
  creates unbounded storage cost and privacy liability with no
  corresponding benefit once content has been verified and summarized
  into Long-term Memory.

## Consequences

This decision makes retrieval predictable and long-term query performance
stable, at the cost of some flexibility — a genuinely novel relationship
type requires a review step rather than being representable instantly.
It also means summarization is a required, ongoing process, not an
optional enhancement, since Recent Memory's promotion into Long-term
Memory depends on it functioning correctly from Phase 1 onward.

## Related Documents

- `docs/04-memory/memory-architecture.md`, `ontology.md`,
  `memory-lifecycle.md` — full implementation detail
- `docs/04-memory/memory-storage.md` — the hybrid storage decision
