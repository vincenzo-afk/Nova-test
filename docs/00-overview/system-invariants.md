# System Invariants

## Purpose

States what must always be true across NOVA's architecture, regardless of
which specific feature or phase is being implemented. Where other
documents describe what a component does, this document states what can
never happen — the foundation every unit and integration test in
`docs/12-testing/` is ultimately checking against, even where a
component's own document does not restate it explicitly.

## Scope

Cross-cutting invariants only. A component-specific invariant that
matters only within one document (e.g., a specific field's valid range)
stays in that document; this document holds invariants that, if
violated, break assumptions other components rely on.

## Identity and reference invariants

- **Every entity has exactly one immutable ID for its lifetime.** A
  `task_id`, `plugin_id`, `capability_id`, `tool_id`, or Knowledge Graph
  node ID (`docs/14-development/naming-conventions.md`) never changes
  once assigned, even across memory-versioning migrations
  (`docs/04-memory/memory-versioning.md`) or entity merges
  (`docs/04-memory/entity-resolution.md`, where a merge retains one ID as
  canonical and the other as a redirect, never reassigning either).
- **Every event has a globally unique `message_id`.**
  (`docs/02-architecture/communication-model.md`) — this is what makes
  at-least-once delivery deduplication possible; a duplicate `message_id`
  is always assumed to be a redelivery, never a distinct new event.
- **Every task has exactly one current state at any moment.**
  (`docs/03-runtime/task-manager.md`) — a task is never simultaneously
  `Executing` and `Paused`; state transitions are atomic from Task
  Manager's perspective, with no observable intermediate state.

## Ownership and boundary invariants

- **The Planner never executes tools directly.** All execution passes
  through the Executor (`docs/03-runtime/executor.md`), gated by the
  Permission Manager — this is Rule 2 in
  `docs/14-development/architecture-rules.md` and is treated as
  absolute, not a default that can be special-cased.
- **No component bypasses the Permission Manager gate.** Per
  `docs/03-runtime/permission-manager.md`, this holds regardless of
  execution tier, agent instance, or plugin source.
- **A capability's declaration is immutable during any execution using
  it.** Once the Planner has selected a capability version
  (`docs/05-ai/capability-registry.md`) for a step, that step's execution
  and verification use the same version's contract throughout — a
  concurrent capability update does not alter an already-selected,
  in-flight step's expected behavior.

## Memory and graph invariants

- **The Knowledge Graph is acyclic with respect to `belongs_to` and `produced_by` edges** (`docs/04-memory/ontology.md`) — a File cannot
  belong to a Project that (transitively) belongs to that same File, and
  a Decision cannot be produced by a Task that was produced by that same
  Decision. The generic `related_to` edge is explicitly exempt from this
  constraint, since it represents arbitrary, potentially symmetric or
  cyclic relationships (e.g., two projects mutually referencing each
  other) by design.
- **A memory record's `schema_version` never decreases.**
  (`docs/04-memory/memory-versioning.md`) — migration is always forward;
  there is no code path that downgrades a record's schema version.
- **Superseded memory records are never deleted by a supersession event
  alone.** (`docs/04-memory/memory-conflict-resolution.md`) — deletion
  only happens through the explicit, user-controlled retention/expiration
  mechanisms in `docs/04-memory/memory-lifecycle.md`.

## Execution and recovery invariants

- **Every checkpoint is replayable.** (`docs/03-runtime/failure-recovery.md`)
  — a checkpoint captures sufficient state (completed steps, their
  results, Working Memory context) that resuming from it never requires
  information that existed only in a crashed process's volatile memory.
- **A tool cannot report success without a declared verification
  signal being checked, unless explicitly restricted to confirmation-
  required execution.** (`docs/06-tools/tool-interface.md`) — this is
  the structural enforcement behind "never assume success."
- **`Unverified` is never silently reported as `Completed`.**
  (`docs/01-product/success-metrics.md`) — this is the single most
  load-bearing invariant in the entire verification model; multiple
  other documents' correctness depends on it holding.

## Why this document exists as a standalone artifact

Individual architecture documents each imply several of the invariants
above, but none states them together as a checklist independent of any
one component's narrative. This is deliberate: these are the properties
that, if violated anywhere, invalidate assumptions made in documents that
may be far removed from the violation's source — a Knowledge Graph cycle
introduced by a change to `docs/04-memory/entity-resolution.md` could
silently break a graph traversal query relied upon in
`docs/09-ui/graph-explorer.md`, for example. Testing against this list
directly (`docs/12-testing/validation.md`) is how such cross-cutting
regressions are caught.

## Related documents

- `docs/14-development/architecture-rules.md` — the non-negotiable
  coding rules enforcing several of these invariants
- `docs/12-testing/validation.md` — where invariant compliance is
  checked as part of acceptance criteria
- `docs/00-overview/ownership-boundaries.md` — the companion document
  defining who is responsible for upholding which invariant
