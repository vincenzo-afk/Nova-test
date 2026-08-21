# Timeline Memory

## Purpose

Describes NOVA's chronological, time-indexed view of memory — distinct
from the Knowledge Graph's relationship-centric view — and the user's
ability to directly control retention over specific time ranges.

## Scope

Temporal storage, retrieval, and user-controlled deletion by time range.
Ranking of temporal relevance within retrieval is `memory-ranking.md`.

## What timeline memory stores

A complete chronological record of significant events across Working
(while active), Recent, and Long-term Memory — not a separate copy of the
data, but a time-indexed access path across those tiers, allowing queries
like "what happened between these two dates" or "reconstruct my activity
last Tuesday" to be answered efficiently without scanning every memory
record.

## Retention

Timeline Memory stores complete history by default — it is not
automatically pruned by age the way Recent Memory is promoted or
summarized (`memory-lifecycle.md`); its purpose is specifically to allow
reconstruction of "what happened when" even after the underlying content
has been summarized elsewhere.

## User-controlled deletion

The user can delete any specific time range manually — for example,
removing all timeline records (and, per the deletion cascade below, the
underlying Recent/Long-term/Archive records) for a specific week. This is
a first-class, explicit control, not a buried setting, consistent with
the consent and data-lifecycle commitments in
`docs/00-overview/non-goals.md`.

## Deletion cascade

Deleting a time range from Timeline Memory cascades to:

1. Any Recent or Long-term Memory record whose primary timestamp falls
   within the deleted range.
2. Any Knowledge Graph node or edge created solely from records in that
   range, provided deleting it does not orphan a still-valid relationship
   from outside the deleted range (in which case the node is retained
   but stripped of the deleted-range-specific properties, and the
   deletion is logged as a partial redaction rather than silently
   leaving stale data).

## Query interface

Timeline queries accept an explicit start/end range and an optional
entity or project filter, returning a chronologically ordered result —
this is the backing mechanism for use cases like "what was I working on
in this repo last Tuesday" (`docs/01-product/use-cases.md`).

## Related documents

- `docs/25-failure-modes/FM-01-memory-and-knowledge-graph.md` — failure modes for this subsystem
- `memory-lifecycle.md` — how records enter and age through the tiers
  Timeline Memory indexes across
- `memory-ranking.md` — how recency is weighted during general retrieval
  (as opposed to an explicit timeline query)
- `knowledge-graph.md` — the cascade interaction described above
