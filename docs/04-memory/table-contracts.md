# Table Contracts

## Purpose

The table-level schema contract for NOVA's relational structured store
(SQLite locally, PostgreSQL under a shared-deployment topology, per
`docs/14-development/technology-stack.md`) — the concrete tables behind
the tier model in `memory-architecture.md` and the Knowledge Graph's
relational modeling described there. This file did not previously exist
despite five sibling files (`relationships.md`, `indexes.md`,
`seed-data.md`, `transactions.md`) already assuming its existence.

## Scope

Table names, columns, and per-table invariants. Cross-table relationships
are `relationships.md`; index strategy is `indexes.md`; write-path
transaction boundaries are `transactions.md`. ORM migrations that alter
these tables are `docs/38-disaster-recovery/migration.md`.

## Core tables

| Table | Tier / subsystem | Key columns | Notes |
|---|---|---|---|
| `working_memory_entries` | Working Memory | `id`, `task_id`, `content_ref`, `created_at` | Ephemeral; per `memory-architecture.md`, cleared or promoted at task/conversation end, never retained past that boundary in this table. |
| `recent_memory_entries` | Recent Memory | `id`, `identity_id`, `source_task_id`, `content_ref`, `confidence`, `created_at` | Rolling window; pruning policy is `docs/04-memory/timeline.md`'s retention model, not a hardcoded row count. |
| `long_term_memory_entries` | Long-term Memory | `id`, `identity_id`, `content_ref`, `confidence`, `verified_at`, `source_lineage_id` | Only entries that crossed the verified/stable bar per `memory-lifecycle.md` land here — this table is never a direct write target from Working Memory. |
| `graph_nodes` | Knowledge Graph | `id`, `entity_type`, `canonical_name`, `identity_id`, `confidence` | Entity type set is the fixed ontology in `docs/04-memory/ontology.md` — no free-text entity types. |
| `graph_edges` | Knowledge Graph | `id`, `from_node_id`, `to_node_id`, `relation_type`, `confidence` | Modeled as a relational join table, not a native graph-DB structure, per `technology-stack.md`'s stated reasoning (shared transactional/backup story). |
| `embeddings` | Retrieval | `id`, `record_id`, `record_table`, `model_id`, `model_version`, `vector` | One row per (record, model+version) pair — `FM-01-019`'s mixed-dimension rejection is enforced at this table's insert path, never silently. |
| `identities` | Multi-identity | `id`, `display_name`, `created_at` | The identity boundary `FM-01-009`/`FM-12-010`'s cross-identity access checks are enforced against. |
| `tasks` | Task Manager | `id`, `state`, `goal`, `identity_id`, `created_at`, `completed_at` | `state` is the enum in `docs/26-system-reference/04-state-transition-tables.md`'s Task Lifecycle table — this column's allowed values are that table, not redefined here. |
| `events` | Event Bus (durable subset) | `event_id`, `event_type`, `occurred_at`, `correlation_id`, `payload` | Only events requiring durable replay/audit are persisted here; most bus traffic is transient per `docs/02-architecture/event-driven-architecture.md`. |
| `audit_log` | Security | `id`, `actor`, `action`, `resource`, `result`, `occurred_at` | Append-only per `docs/10-security/audit.md` — no `UPDATE`/`DELETE` grant exists on this table for any application role. |

## What is deliberately not a table

Vector index structures (HNSW/ANN) are not relational tables — they are
a co-located index over the `embeddings` table's `vector` column, per
`docs/04-memory/retrieval-engine.md`'s semantic search index structure.
Working set/in-flight orchestration state (current plan step, active
tool call) is process memory, not persisted here — only its durable
outcomes (task state transitions, memory writes) land in these tables,
consistent with `desktop.md`'s note that transient desktop UI state is
not itself a memory tier.

## Related documents

- `docs/04-memory/memory-architecture.md` — the tier model these tables implement
- `relationships.md`, `indexes.md`, `transactions.md`, `seed-data.md` — the rest of this cluster
- `docs/14-development/technology-stack.md` — ORM/database engine choice
- `docs/38-disaster-recovery/migration.md` — how these tables change over time
