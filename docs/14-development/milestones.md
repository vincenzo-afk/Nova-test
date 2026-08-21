# Milestones

## Purpose

Concrete, checkable milestones marking progress through
`implementation-order.md`'s build sequence, each tied to a specific,
demonstrable capability rather than an internal implementation detail
only engineers would recognize as progress.

## Scope

Milestone definitions per phase. Detailed build steps are
`implementation-order.md`; phase-level deliverables are `ROADMAP.md`.

## Phase 1 milestones

- **M1.1** — Communication Bus operational; two stub services can
  exchange a message conforming to `docs/02-architecture/communication-model.md`'s envelope.
- **M1.2** — Filesystem Observer captures a real file change and it
  appears, correctly normalized, in Recent Memory.
- **M1.3** — A natural-language question about a previously observed
  file or project returns a grounded answer with source attribution,
  per `docs/04-memory/search.md`'s grounding requirement — this is
  Phase 1's defining, demoable milestone.
- **M1.4** — The Knowledge Graph correctly links a File node to its
  Project node via the `belongs_to` edge, queryable through a multi-hop
  traversal.

## Phase 2 milestones

- **M2.1** — A deterministic file-operation task (e.g., "open
  config.json") executes end-to-end through Task Manager, Executor, and
  Verifier, reporting a ground-truth-verified result.
- **M2.2** — A reversible-write action is executed, then successfully
  undone via the undo mechanism, with the audit trail
  (`docs/10-security/audit.md`) showing both the action and its reversal.
- **M2.3** — A destructive-tier action is correctly blocked pending
  confirmation, and correctly proceeds only after explicit approval.

## Phase 3 milestones

- **M3.1** — A multi-step task (per `docs/01-product/use-cases.md`'s
  "clean up Downloads folder" example) completes with per-step
  verification, correctly handling a deliberately injected mid-task
  failure via replanning.
- **M3.2** — Two concurrently running tasks correctly serialize access to
  a shared file via the Resource Manager, with no data loss.

## Phase 4 milestones

- **M4.1** — A GUI-automation task against a single allow-listed test
  application completes correctly, with pre-action focus validation
  demonstrably preventing action against the wrong window when the
  active window is deliberately changed mid-task.

## Milestone acceptance

A milestone is not considered reached until it passes the full
validation checklist in `docs/12-testing/validation.md` for the
components involved — a milestone demoed informally but without passing
tests does not count as complete.

## Related documents

- `implementation-order.md` — the build steps leading to each milestone
- `ROADMAP.md` — the phase-level deliverables these milestones mark
  progress toward
- `docs/12-testing/validation.md` — the acceptance criteria applied to
  each milestone
