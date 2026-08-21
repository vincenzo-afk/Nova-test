# Embeddings

## Purpose

Specifies what content gets embedded, which embedding model is used, and
how embeddings are kept consistent as models change over time.

## Scope

Embedding generation only. Consumption of embeddings for semantic search
is `retrieval-engine.md`.

## What gets embedded

Text content of observed and generated memory: document contents (subject
to size limits, chunked per `docs/05-ai/context-builder.md`'s chunking
rules), conversation and task summaries, Knowledge Graph node
descriptions, and user preference statements. Raw structural metadata
(timestamps, file sizes, exact paths) is not embedded — it is served by
keyword/temporal/exact search instead, per `retrieval-engine.md`'s fusion
design.

## Model selection

Embedding generation follows the same provider abstraction as any other
AI capability (`docs/05-ai/model-providers.md`): a local embedding model
by default (supporting fully offline operation, per
`docs/00-overview/non-goals.md`'s local-first stance), or a cloud
provider's embedding model if the user has configured one. The Model
Router (`docs/05-ai/model-router.md`) resolves which embedding model
handles a given request the same way it resolves any other model request.

## Embedding versioning

Every stored embedding is tagged with the model identifier and version
that produced it. Because different embedding models produce
non-comparable vector spaces, a semantic search query is only run against
embeddings produced by the currently active embedding model — mixed-model
comparison is not supported, since it produces meaningless similarity
scores.

## Re-embedding on model change

If the user switches embedding models (e.g., moving from a local model to
a cloud provider's, or upgrading a local model version), previously stored
content is not immediately re-embedded in bulk — that would be an
expensive, disruptive background operation. Instead, re-embedding happens
lazily: content is re-embedded under the new model the next time it is
accessed or updated, and a background low-priority job re-embeds
long-term/archived content over time. Search during the transition period
degrades gracefully by falling back more heavily on keyword/graph/entity
search for content not yet re-embedded, rather than silently returning
incomplete semantic results without indication.

## Chunking

Long documents are chunked before embedding, with chunk boundaries chosen
to preserve semantic coherence (paragraph or section boundaries) rather
than fixed character counts alone, and each chunk retains a reference back
to its parent document and position, so retrieval can return the specific
relevant passage rather than forcing consumers to re-fetch and re-search
the whole document.

## Related documents

- `docs/25-failure-modes/FM-01-memory-and-knowledge-graph.md` — failure modes for this subsystem
- `retrieval-engine.md` — how embeddings are queried for semantic search
- `docs/05-ai/model-providers.md`, `docs/05-ai/model-router.md` — the
  provider abstraction embedding generation uses
- `indexing.md` — where embedding generation sits in the overall pipeline
