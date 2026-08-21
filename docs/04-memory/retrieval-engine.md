# Retrieval Engine (Retrieval Fusion Engine)

## Purpose

Defines how a single query — from the Planner's Context Builder, from a
direct user search, or from any other consumer — retrieves relevant
information across fundamentally different search mechanisms (semantic,
keyword, graph, temporal, exact, entity) and merges them into one coherent
ranked result, rather than exposing five disconnected search paths.

## Scope

Query-time retrieval and fusion logic. Ranking weights are detailed in
`memory-ranking.md`; the underlying indexes queried here are built per
`indexing.md` and `embeddings.md`.

## The fusion pipeline

```mermaid
flowchart TD
    Q[Incoming query] --> S[Semantic search<br/>vector similarity]
    Q --> K[Keyword search<br/>exact/fuzzy text match]
    Q --> G[Graph search<br/>entity/relationship traversal]
    Q --> T[Temporal search<br/>time-range filtering]
    Q --> E[Entity search<br/>direct entity lookup]
    S --> F[Fusion + weighted ranking<br/>memory-ranking.md]
    K --> F
    G --> F
    T --> F
    E --> F
    F --> R[Ranked, deduplicated result set]
```

## Semantic search index structure

The vector-similarity search above is a brute-force (exact) comparison
against every embedding while the corpus is small, and switches to an
approximate-nearest-neighbor (ANN) index (e.g., HNSW) once corpus size
crosses a configurable threshold where brute-force search's linear scan
would start measurably degrading query latency, per
`docs/11-performance/performance-goals.md`'s latency budget. This is an
internal implementation switch, not a user-visible mode — result
relevance is expected to be equivalent, since ANN indexes are tuned for
high recall at this corpus scale. `docs/25-failure-modes/FM-16-009` (slow
memory search) is the failure this threshold-based switch exists to
prevent.

## Why fusion rather than one dominant method

Each method answers a different kind of question well and others poorly:
semantic search finds conceptually related content even without matching
words, but performs poorly on exact identifiers (a specific filename);
keyword search is precise for exact matches but blind to paraphrased
queries; graph search finds relationships neither of the above can
(e.g., "what files are linked to this project") but does not rank by
textual relevance at all; temporal search narrows by recency/time-range
but says nothing about relevance within that range. Fusion exists because
no single one of these is sufficient for the range of queries NOVA needs
to answer (see `docs/01-product/use-cases.md` for the range of Phase 1
queries this must support).

## Fusion and deduplication

Results from each method are merged by underlying record identity — the
same Long-term Memory record surfaced by both semantic and keyword search
is merged into a single ranked entry rather than appearing twice, with
its final rank reflecting the combined signal from every method that
surfaced it (per the weighting model in `memory-ranking.md`).

## Query routing optimization

Not every query needs all five methods run in full every time. A query
containing an exact filename or ID is short-circuited toward keyword and
entity search first, falling back to semantic/graph search only if those
do not produce a sufficiently confident result — this is a direct
application of Principle 1 (Deterministic Before Intelligent) to
retrieval itself: an expensive semantic/vector search is not run when a
cheap exact lookup already answers the query with high confidence.

## Degraded operation when a branch is unavailable

The five branches above are independent — none of the other four depend
on the embedding/semantic-search service being reachable. If it is
unavailable (`FM-01-021`), the fusion step runs with keyword, graph,
temporal, and entity results only; this is what makes
`docs/29-product/search.md`'s "must degrade gracefully to keyword-only
matching, never a blank/error result" commitment concretely true rather
than an unimplemented aspiration — it falls directly out of the fusion
pipeline's branch independence, not a separate fallback code path that
has to be built and kept in sync.

## Interaction with Context Builder

The Context Builder (`docs/05-ai/context-builder.md`) is the primary
internal consumer of this engine, converting a planning need ("what do I
know about project X") into one or more fusion queries and packing the
ranked results into the model's working context under its token budget.
The user-facing `search.md` interface is a second, more direct consumer.

## Related documents

- `docs/25-failure-modes/FM-01-memory-and-knowledge-graph.md` — failure modes for this subsystem
- `memory-ranking.md` — the weighting model used at the fusion step
- `indexing.md`, `embeddings.md` — how the underlying indexes are built
- `docs/05-ai/context-builder.md` — the primary internal consumer
- `search.md` — the user-facing search interface
