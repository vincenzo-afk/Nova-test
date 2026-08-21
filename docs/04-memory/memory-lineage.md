# Memory Lineage

## Purpose

Tracks the provenance of a memory record — what it was derived from,
summarized from, merged from, or split from — so that a record's history
is traceable, not just its current content. This complements
`docs/04-memory/memory-confidence.md`'s `source` field (which records
where content originated) with the transformations a record has been
through since.

## Scope

Provenance tracking specifically. The mechanisms that perform
summarization, merging, and splitting are documented in their owning
processes (`docs/04-memory/memory-lifecycle.md`,
`docs/04-memory/entity-resolution.md`); this document specifies how each
leaves a lineage trace.

## Lineage relationship types

```json
{
  "record_id": "string",
  "lineage": [
    { "relation": "derived_from", "source_record_id": "string" },
    { "relation": "summarized_from", "source_record_ids": ["array of strings"] },
    { "relation": "merged_from", "source_record_ids": ["array of strings"] },
    { "relation": "split_from", "source_record_id": "string" }
  ]
}
```

- **`derived_from`** — a record produced by reasoning over another (e.g.,
  an LLM-synthesized summary derived from a specific document record).
- **`summarized_from`** — a Long-term Memory summary produced from one or
  more Recent Memory records during the promotion step in
  `docs/04-memory/memory-lifecycle.md`.
- **`merged_from`** — a Knowledge Graph node produced by merging two
  previously distinct nodes, per `docs/04-memory/entity-resolution.md`'s
  manual merge capability.
- **`split_from`** — the inverse: a node produced by splitting a
  previously merged node back apart.

## Why lineage matters beyond simple auditability

Beyond the general audit trail (`docs/10-security/audit.md`, which
tracks *actions* NOVA took), lineage tracks the provenance of *content*
itself — this is what makes it possible to answer "where did this
summary actually come from" or "was this fact ever part of a different
node before a merge," which the audit trail alone (scoped to task
execution) does not cover, since not every memory transformation
(e.g., routine summarization) is task-execution-triggered.

## Lineage and confidence

A record's confidence (`docs/04-memory/memory-confidence.md`) can be
informed by its lineage: a summary `summarized_from` multiple `user_confirmed` records inherits a reasonable basis for higher confidence than one `derived_from` a single low-confidence,
`llm_synthesized` source — lineage is one input to confidence
computation, not a separate, disconnected metadata trail.

## Lineage and reversibility

Per `docs/04-memory/entity-resolution.md`'s manual merge/split capability,
lineage is what makes a split operation possible at all: reversing a
merge requires knowing exactly which original records contributed to the
merged node, which the `merged_from` lineage entry preserves.

## Retention of lineage after source deletion

If a source record is later deleted (via expiration,
`docs/04-memory/memory-garbage-collection.md`), a `summarized_from` or `derived_from` lineage reference to it is retained as a historical
pointer (noting the source no longer exists) rather than silently
removed — this preserves the ability to know a summary had a specific
provenance even after the underlying detail has been reclaimed.

## Related documents

- `docs/25-failure-modes/FM-01-memory-and-knowledge-graph.md` — failure modes for this subsystem
- `docs/04-memory/memory-confidence.md` — confidence scoring, informed by
  lineage
- `docs/04-memory/entity-resolution.md` — the merge/split operations this
  document tracks provenance for
- `docs/04-memory/memory-lifecycle.md` — the summarization process that
  produces `summarized_from` lineage entries
