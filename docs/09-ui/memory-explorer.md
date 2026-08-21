# Memory Explorer

## Purpose

The browsing-oriented interface for a user to directly inspect what NOVA
has stored — as opposed to Chat's question-answering interaction model —
serving the "browse everything NOVA knows about me" need identified
during this project's foundational design review.

## Scope

Memory Explorer-specific browsing and filtering UI. The underlying data
source is `docs/04-memory/retrieval-engine.md` and `docs/04-memory/timeline.md`.

## Browsing modes

- **Search** — free-text query over the Retrieval Fusion Engine
  (`docs/04-memory/retrieval-engine.md`), identical to Chat's underlying
  search mechanism but presented as a browsable result list rather than a
  synthesized answer.
- **Timeline** — chronological browsing by date/time range, backed
  directly by `docs/04-memory/timeline.md`.
- **Filtered browse** — by project, entity type
  (`docs/04-memory/ontology.md` node types), or memory tier
  (`docs/04-memory/memory-types.md`).

## Direct record inspection

Selecting a record shows its full detail: which memory tier it currently
resides in, its confidence score (`docs/04-memory/memory-ranking.md`),
its linked Knowledge Graph entities, and — for records derived from a
completed task — a link into that task's audit trail
(`docs/10-security/audit.md`) for full step-level detail.

## User-controlled deletion

Per `docs/04-memory/timeline.md`'s retention model, the Memory Explorer
is where a user exercises the explicit right to delete a specific time
range or specific records — this control is surfaced directly in this
UI, not buried in a separate settings area, consistent with the
first-class treatment that capability was designed to have.

## Preference inspection and correction

User Preferences (`docs/04-memory/memory-types.md`) are browsable here
with their current confidence score
(`docs/04-memory/memory-ranking.md`) visible, and a user can directly
issue a correction to a stored preference from this view — which, per
`docs/04-memory/memory-ranking.md`'s correction-handling rule,
immediately supersedes the previous value regardless of its prior
accumulated confidence.

## Related documents

- `docs/25-failure-modes/FM-22-user-interaction-and-analytics.md` — failure modes for this subsystem
- `docs/04-memory/retrieval-engine.md`, `timeline.md` — the underlying
  data sources
- `docs/04-memory/memory-ranking.md` — confidence scores shown per record
- `docs/10-security/audit.md` — the audit-trail link for task-derived
  records
