# Branching Strategy

## Purpose

Defines the git branching and release model, aligned to the phased
development order in `ROADMAP.md` so that a phase's scope maps cleanly to
a reviewable, mergeable unit of work rather than blending across phases.

## Scope

Branching, merging, and release conventions.

## Branch structure

- **`main`** — always reflects the currently released, stable state;
  every commit on `main` corresponds to a version that has passed the
  full validation checklist (`docs/12-testing/validation.md`).
- **`phase/N-<name>`** — a long-lived integration branch per roadmap
  phase (e.g., `phase/1-observation-memory`), into which feature branches
  for that phase's scope are merged; a phase branch is only merged into
  `main` once every deliverable listed for that phase in `ROADMAP.md` is
  complete and validated.
- **Feature branches** — short-lived, one per documented component or
  sub-component (e.g., `feature/planner-deterministic-check`), branched
  from and merged back into the current phase branch.

## Why phase branches, not direct-to-main feature branches

Per `ROADMAP.md`'s hard rule that no phase begins implementation before
the phase before it is working and trusted, merging phase-scoped work
directly to `main` incrementally risks `main` reflecting a partially
completed phase whose safety scaffolding (e.g., Phase 2's undo mechanism)
is not yet fully in place — phase branches keep `main` always
representing a complete, validated phase boundary.

## Pull request requirements

Every pull request into a phase branch must reference the specific
documentation section(s) it implements (`CONTRIBUTING.md`), pass the
module checklist (`module-checklist.md`), and include the applicable
tests from `docs/12-testing/` for its layer.

## Commit conventions

Commit messages reference the documentation path they implement or
modify (e.g., `docs/03-runtime/planner.md: implement replanning budget check`), making it straightforward to trace implementation history back
to the specification that motivated it.

## Related documents

- `ROADMAP.md` — the phase structure this branching model mirrors
- `module-checklist.md` — the PR-level requirements referenced above
- `implementation-order.md` — build sequencing within a phase
