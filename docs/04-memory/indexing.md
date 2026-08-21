# Indexing

## Purpose

Specifies the pipeline that turns a raw observation or task outcome into
something searchable by the Retrieval Engine, immediately and
consistently — this is the mechanism behind "everything becomes
searchable immediately" as a firm requirement, not an eventual-consistency
best effort.

## Scope

The indexing pipeline itself. Embedding generation specifics are
`embeddings.md`; the resulting query interface is `retrieval-engine.md`.

## Pipeline

```mermaid
flowchart LR
    A[Observe] --> B[Normalize]
    B --> C[Entity Extraction]
    C --> D[Metadata Extraction]
    D --> E[Embedding Generation]
    E --> F[Knowledge Graph Linking]
    F --> G[Memory Classification]
    G --> H[Index Creation]
    H --> I[Store]
```

- **Normalize** — convert the raw event into the standard envelope
  (`docs/02-architecture/communication-model.md`).
- **Entity Extraction** — identify which known entity types (per the
  fixed ontology, `ontology.md`) this event relates to.
- **Metadata Extraction** — pull structured fields (file type, size,
  modification time, associated project) for keyword/exact/temporal
  search.
- **Embedding Generation** — produce a vector representation for semantic
  search, per `embeddings.md`.
- **Knowledge Graph Linking** — resolve extracted entities against
  existing graph nodes (`entity-resolution.md`) and create or update
  relationships.
- **Memory Classification** — determine which memory tier this belongs in
  initially. Per `memory-lifecycle.md`'s pipeline, every newly indexed
  item always starts in Working Memory; promotion to Recent Memory
  happens later, only when its originating task ends and is judged
  successfully or meaningfully concluded — indexing itself never places
  new content directly into Recent Memory.
- **Index Creation** — write into the keyword, semantic, temporal, and
  entity indexes the Retrieval Engine queries.
- **Store** — persist via the storage engines in `memory-storage.md`.

## Immediacy guarantee

Every stage above runs synchronously enough, within the asynchronous event
pipeline (`docs/02-architecture/execution-pipeline.md`), that a piece of
information is searchable within the same session it was observed in —
there is no separate, delayed "batch indexing" step a user has to wait
for.

## Bulk-change indexing path

For bulk-change events produced by the event-storm handling in
`docs/02-architecture/event-driven-architecture.md` (e.g., a large git
clone), this pipeline runs in a batched mode: entity extraction and
embedding generation are applied to the operation as a whole (e.g., "this
repository was cloned, containing N files of these types") plus a
representative sample of significant individual files, rather than running
the full per-file pipeline against every one of tens of thousands of
files individually. Full per-file indexing for a bulk-imported set
happens lazily, in the background, at low priority, so it does not compete
with interactive-task indexing needs.

## Reindexing on schema change

When the ontology (`ontology.md`) is versioned forward, previously
indexed entities are migrated according to that version's migration
rules, not silently left inconsistent with newly indexed data — see
`memory-storage.md` for how schema migration is tracked.

## Related documents

- `docs/25-failure-modes/FM-01-memory-and-knowledge-graph.md` — failure modes for this subsystem
- `embeddings.md` — the embedding generation stage in detail
- `entity-resolution.md` — how entity linking resolves to existing nodes
- `docs/02-architecture/event-driven-architecture.md` — the bulk-change
  event handling this pipeline adapts to
