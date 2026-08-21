# Memory Storage

## Purpose

Specifies the concrete storage engine used for each memory tier and the
Knowledge Graph, replacing the conceptual tier descriptions in
`memory-types.md` with an actual technology decision, per ADR 0002
(`docs/02-architecture/architecture-decisions.md`).

## Scope

Storage technology and schema-level organization only. Query and ranking
logic is `retrieval-engine.md` and `memory-ranking.md`.

## Storage assignment

| Tier / component | Storage engine | Rationale |
|---|---|---|
| Working Memory | In-process structured store (SQLite, WAL mode) | Short-lived, high-frequency writes within a single task; no need for a separate server process |
| Recent Memory | SQLite (structured metadata) + local vector store (embeddings) | Structured queries (by task, by time) plus semantic search over recent content |
| Long-term Memory | SQLite/Postgres (structured facts) + vector store (embeddings) | Same dual-access pattern as Recent Memory, at larger scale and longer retention |
| Knowledge Graph | Dedicated embedded graph database | Native support for entity/relationship traversal queries that a relational store would require expensive joins for |
| Archive | Same structured + vector storage as Long-term Memory, on a separate, less frequently accessed volume/table set | Keeps active-tier query performance from degrading as history accumulates |
| Raw artifacts (full documents, large content) | Local blob storage, referenced by ID from structured records | Avoids duplicating large content across every tier that references it |

SQLite is the default for single-machine v1 deployment; the schema is
written to be portable to Postgres without redesign, since Phase 5
(multi-device sync, `ROADMAP.md`) will require a client-server-capable
option.

## Durability and integrity

SQLite's WAL mode (used for every tier above) provides crash-safe,
write-ahead-logged durability at the storage-engine level — a write
either fully commits or is rolled back on the next open, never leaving
a torn/partial record. In addition, every memory record stores a
checksum of its own content, verified on read; a checksum mismatch
marks the record `corrupted` rather than returning malformed data
silently, per `docs/25-failure-modes/FM-01-memory-and-knowledge-graph.md`'s FM-01-005 (memory corruption).

## Workspace scoping and isolation

Every memory record is stamped with the `workspace_id` of the single
NOVA identity it belongs to
(`docs/28-multi-device-protocol/10-identity-and-workspace.md`) and this
scoping is enforced at the storage-engine level (a separate database/
schema per workspace, not a shared table with an application-level
filter that a bug could bypass) — never only checked in application
code above the storage layer. Since NOVA is explicitly not multi-user
(`docs/00-overview/non-goals.md`), there is exactly one workspace per
running instance in the common case, but the enforcement exists
regardless, since multiple independent workspaces can still coexist on
one physical machine (e.g., separate OS user accounts each running
their own NOVA instance) and must never read each other's memory, per
`docs/25-failure-modes/FM-01-memory-and-knowledge-graph.md`'s FM-01-009
(privacy leak / cross-workspace bleed).

## Why hybrid rather than one database for everything

A single storage technology optimized for structured queries (SQLite/
Postgres) is poor at semantic similarity search; a vector database alone
is poor at exact, structured lookups (e.g., "all tasks completed
yesterday"). The Retrieval Fusion Engine (`retrieval-engine.md`)
specifically depends on being able to query both kinds of index and merge
results — a single-engine design would force one of these query types to
be implemented inefficiently on top of the wrong storage model.

## Encryption at rest

All persistent memory storage (structured, vector, and graph) is
encrypted at rest, per `docs/10-security/encryption.md` (Tier 3). This
applies uniformly across tiers — there is no "less sensitive" tier that
is exempted.

## Schema migration

Structured schema changes (e.g., adding a new field to the task-outcome
record) follow standard forward-only migrations tracked by version
number. Knowledge Graph ontology changes are more restrictive and follow
the dedicated versioning process in `ontology.md`, since graph schema
changes have wider blast radius across every existing node.

## Backup

Periodic snapshots of all storage engines are taken together (not
independently per engine) to avoid a restore that leaves, for example,
the Knowledge Graph and Recent Memory in an inconsistent state relative to
each other — see `docs/13-devops/backup.md` (Tier 3).

## Related documents

- `docs/25-failure-modes/FM-01-memory-and-knowledge-graph.md` — failure modes for this subsystem
- `memory-architecture.md` — the tiers this storage assignment implements
- `docs/10-security/encryption.md` (Tier 3) — encryption-at-rest detail
- `docs/13-devops/backup.md` (Tier 3) — backup/restore mechanics
