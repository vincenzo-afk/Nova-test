# Ontology

## Purpose

Defines the closed, versioned schema of node and edge types the Knowledge
Graph is permitted to contain, and the process by which that schema is
allowed to change. This document exists specifically to prevent the
schema-drift failure mode identified in the project's foundational
review: an LLM-extensible graph schema degrades in consistency over time.

## Scope

Schema definition and change-management process. Query patterns against
this schema are `knowledge-graph.md`.

## Ownership rule

**The system defines the ontology. The model only instantiates nodes and
relationships using the existing schema — it never invents a new node or
edge type at runtime**, regardless of how novel or well-justified a new
relationship might seem in the moment. This is enforced at the Knowledge
Graph write layer (`knowledge-graph.md`), not merely as a prompting
convention that could be bypassed.

## v1 node types

| Node type | Key properties |
|---|---|
| User | preferences (linked), identity |
| Project | name, root path(s), status, created/last-active timestamps |
| File | path, type, size, timestamps, content hash |
| Application | name, install path, version (where observable) |
| Task | goal, outcome, `correlation_id`, timestamps |
| Decision | statement, rationale, date, linked source (task/conversation) |
| Tool | identifier, execution tier, risk tier |
| Conversation | summary, timestamps, linked project (if applicable) |

## v2 node types (additive — see Versioning and migration below)

Added to close a gap where three concepts already handled extensively by
other subsystems (channel contacts, multi-week objectives, paired
hardware) had no Knowledge Graph representation, making them unreachable
by graph queries that relate them to Files, Projects, or Tasks.

| Node type | Key properties | Added because |
|---|---|---|
| Person | display name, identifiers (email/phone/handle, per source), relationship type (contact/collaborator/unknown), first/last seen | `docs/21-channels/` (email, calendar, messaging) already surfaces attendees and correspondents as unstructured strings; this makes them queryable entities |
| Goal | statement, status (active/blocked/achieved/abandoned), target date (optional), created timestamp | `docs/23-autonomy/goal-tracking.md` needs a durable object to attach progress, blockers, and Task contributions to |
| Device | name, platform, role (primary/peer/companion, per `docs/20-devices/multi-device-architecture.md`), paired-at timestamp | Cross-device queries ("which device has the latest version of this file") had no graph anchor despite multi-device support existing |

## v1 edge types

| Edge type | From → To | Meaning |
|---|---|---|
| `belongs_to` | File → Project | File is part of this project |
| `depends_on` | Project → Tool | Project's workflow uses this tool |
| `produced_by` | Decision → Task or Conversation | Decision originated here |
| `performed_on` | Task → File or Application | Task acted on this entity |
| `related_to` | any → any | Generic weighted relationship for cases not covered by a specific edge type above |

## v2 edge types (additive)

| Edge type | From → To | Meaning |
|---|---|---|
| `involves` | Conversation or Task → Person | This person participated in or was the subject of this |
| `pursues` | User → Goal | The user is actively working toward this goal |
| `advances` | Task → Goal | Completing this task moved a goal forward, per `docs/23-autonomy/goal-tracking.md` |
| `blocks` | any node → Goal | This entity (a missing Decision, a stalled Task, an unresolved Person dependency) is identified as blocking a goal |
| `resides_on` | File → Device | Tracks which paired device holds a given file, for cross-device queries |

`Person` records are subject to the same entity-resolution matching as
any other node (`entity-resolution.md`) and the same retention/deletion
controls as any other memory (`docs/04-memory/memory-lifecycle.md`) — a
`Person` node is never created from a purely observational signal without
the same confidence handling applied to any other extracted entity
(`docs/04-memory/memory-confidence.md`).

## Proposing a new node or edge type

A new type is proposed, not applied automatically, when the Planner or
any agent instance encounters a situation the current ontology cannot
represent well. The proposal is logged (with the specific case that
prompted it) and queued for review — either a periodic batch review or an
explicit user/maintainer review — before being merged into a new ontology
version. Nothing is added to the live schema without going through this
review, even temporarily.

## Versioning and migration

The ontology carries an explicit version number. A version change that
adds a new type is additive and requires no migration of existing nodes —
the v2 Person/Goal/Device types above are a concrete instance of this: no
existing v1 node or edge is altered, so v1 data remains valid under v2
without a migration pass.
A version change that alters an existing type's properties (renaming,
removing, or changing the meaning of a field) requires a migration that
updates all existing nodes of that type before the new version is
considered active — partial migration states are not permitted to persist
across a restart.

## Related documents

- `docs/25-failure-modes/FM-01-memory-and-knowledge-graph.md` — failure modes for this subsystem
- `knowledge-graph.md` — how this schema is queried
- `entity-resolution.md` — how instances are matched against these types
- `docs/02-architecture/architecture-decisions.md` — ADR 0002, which
  ratified the fixed-schema decision this document implements
