# Indexes

## Purpose

Index strategy for `table-contracts.md`'s relational tables. The
vector/ANN index over `embeddings.vector` is specified in
`docs/04-memory/retrieval-engine.md`'s Semantic search index structure
section and is not repeated here — this file covers conventional
B-tree/lookup indexes only.

## Scope

Which columns are indexed and why. Query patterns that motivate each
index are the fusion pipeline branches in `retrieval-engine.md` and the
lookups in `docs/03-runtime/task-manager.md`.

## Required indexes

| Table | Index | Motivating query |
|---|---|---|
| `recent_memory_entries` | `(identity_id, created_at DESC)` | Retrieval Fusion Engine's temporal-search branch and Recent Memory's rolling-window pruning, both of which scan by identity + recency. |
| `long_term_memory_entries` | `(identity_id, confidence DESC)` | Memory-ranking's confidence-weighted retrieval. |
| `graph_nodes` | `(identity_id, entity_type, canonical_name)` | Entity-search branch's direct entity lookup, and duplicate-entity detection at write time. |
| `graph_edges` | `(from_node_id)`, `(to_node_id)` | Graph-search branch's relationship traversal in both directions — a single-direction index would make one traversal direction a full scan. |
| `embeddings` | `(record_table, record_id)` | The polymorphic lookup `relationships.md` describes for resolving an embedding back to its source record. |
| `tasks` | `(identity_id, state)` | Task Manager's active-task queries and the Scheduler's per-identity concurrency limits. |
| `audit_log` | `(actor, occurred_at DESC)` | Audit trail review (`docs/10-security/audit.md`) — append-only tables still need an efficient read path for their primary consumer query. |

## Index maintenance is not a manual process

Every index above is declared in the Prisma schema (`technology-stack.md`)
and created/migrated automatically by the same migration process as the
tables themselves (`docs/38-disaster-recovery/migration.md`) — there is
no separate manual indexing step or DBA-style index-tuning workflow,
consistent with the local-first, no-hosted-ops-team default deployment
this project targets.

## What is deliberately not indexed

`working_memory_entries` has no dedicated secondary index beyond its
primary key — its table-contracts.md-defined lifetime is bounded to a
single active task/conversation, so its row count never grows large
enough for a missing index to be a realistic performance concern, per
`docs/11-performance/scalability.md`'s reasoning that optimization effort
should track actual growth, not every table uniformly.

## Related documents

- `table-contracts.md` — the tables these indexes apply to
- `docs/04-memory/retrieval-engine.md` — the vector/ANN index (out of scope here) and the query patterns motivating the indexes above
- `docs/11-performance/scalability.md` — why optimization effort is prioritized by realistic growth, not applied uniformly
