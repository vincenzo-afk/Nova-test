# Relationships

## Purpose

The foreign-key/relationship model between `table-contracts.md`'s
tables — which references are enforced at the database layer versus
application layer, and why the Knowledge Graph's node/edge tables are
the one place a self-referential relationship is load-bearing rather
than incidental.

## Scope

Cross-table relationships only. Individual table columns are
`table-contracts.md`; index support for these relationships is
`indexes.md`.

## Core relationships

| Relationship | Enforcement | Notes |
|---|---|---|
| `recent_memory_entries.identity_id → identities.id` | DB foreign key | Every memory row belongs to exactly one identity — this is the column `FM-01-009`'s cross-identity access check ultimately filters on. |
| `long_term_memory_entries.source_lineage_id → recent_memory_entries.id` \| `working_memory_entries.id` | Application-layer (polymorphic; not a single DB FK) | Lineage can point to either upstream tier per `memory-lineage.md`; a single-target DB foreign key can't express that union, so lineage integrity is enforced at the write path, not the schema. |
| `graph_edges.from_node_id / to_node_id → graph_nodes.id` | DB foreign key, `ON DELETE RESTRICT` | An edge can never outlive either endpoint node — deleting a node requires its edges to be explicitly removed or reassigned first, never cascaded silently, since a silently-vanished edge is exactly the kind of memory-lineage gap `FM-01`'s catalog exists to prevent. |
| `graph_nodes.identity_id → identities.id` | DB foreign key | Same identity-scoping as memory entries; a node is never shared across identities even if the underlying entity (e.g., a well-known public fact) would be identical. |
| `embeddings.record_id → {recent_memory_entries, long_term_memory_entries, graph_nodes}.id` | Application-layer (polymorphic via `record_table`) | Same reasoning as the lineage relationship above — one embeddings table serves multiple record tables by design (`table-contracts.md`), so the FK is resolved by `record_table` + `record_id` together, checked at write time. |
| `tasks.identity_id → identities.id` | DB foreign key | — |
| `events.correlation_id → tasks.id` (when the event is task-scoped) | Application-layer, not enforced | Not every event is task-scoped (e.g., a `provider.health_changed` event); a DB foreign key would force every event to reference a task, which is false for whole event categories in `docs/26-system-reference/07-event-catalog.md`. |

## Acyclicity is not a database constraint

The Knowledge Graph's no-cycles invariant (`NOVA-MEM002`,
`docs/00-overview/system-invariants.md`) is checked at the application
write path before an insert/update is committed, not expressed as a
relational constraint — no mainstream relational database can express
"no cycle through this self-referential edge table" as a declarative
constraint, so this is one of the cases in `technology-stack.md`'s
choice of a relational graph model where correctness depends on the
write-path check in `docs/04-memory/knowledge-graph.md`, not the schema
alone.

## Related documents

- `table-contracts.md` — the tables these relationships connect
- `docs/04-memory/memory-lineage.md` — the lineage relationship's full semantics
- `docs/04-memory/knowledge-graph.md` — the write-path cycle check
- `docs/00-overview/system-invariants.md` — the acyclic-graph invariant
