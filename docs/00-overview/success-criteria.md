# Success Criteria

## Purpose

Defines what "NOVA is working" means, concretely enough to be checked —
as distinct from `docs/01-product/success-metrics.md` and `docs/11-performance/performance-goals.md`, which measure the *product*
and the *runtime* respectively. This document is the top-level rollup:
the small set of criteria that, if all true, mean the project has
achieved what `vision.md` and `goals.md` set out to do. Everything more
granular (per-feature acceptance criteria, per-component performance
budgets) exists to make these criteria checkable in practice.

## Scope

Project-level, milestone-independent success criteria. Feature-specific
acceptance criteria belong in
`docs/43-ai-development/acceptance-criteria.md`; phase milestones belong
in `docs/14-development/milestones.md`.

## Criteria

### 1. Correctness under the invariants

Every invariant in `system-invariants.md` holds continuously in
production, not just in the test suite. A single confirmed invariant
violation in a live workspace is treated as a Sev-1 incident
(`docs/48-incident-response/severity.md`), regardless of user-visible
impact, because an invariant violation means the model the rest of the
system relies on is no longer true.

### 2. Deterministic-first is actually happening

A representative sample of production task executions shows the
Deterministic Before Intelligent principle
(`design-principles.md`) is being honored in practice — most tasks
resolve without an LLM call, and LLM calls are concentrated on genuinely
ambiguous or generative work. If LLM usage trends toward "used for
everything," that is a regression against this principle even if
individual tasks succeed, because it signals the deterministic paths
aren't being built or aren't being reached.

### 3. Memory improves outcomes measurably

Task success rate and time-to-completion measurably improve as a given
workspace's memory graph grows, compared to a cold workspace with no
history. If memory does not measurably help over time, the memory
subsystem (`docs/04-memory/`) has not achieved its purpose regardless of
how architecturally sound it is.

### 4. Recovery is boring

Crash recovery, plugin failure, provider failure, and sync conflicts
(`docs/25-failure-modes/`, `docs/38-disaster-recovery/`) resolve
automatically, without data loss and without requiring the user to
understand what went wrong, in the overwhelming majority of cases. "The
user had to read a stack trace to recover" is a failure of this
criterion even if data was ultimately not lost.

### 5. Trust is earned incrementally and never violated

Autonomy escalates only along the paths defined in
`docs/23-autonomy/` and `docs/25-failure-modes/FM-18-autonomy-policy-approval.md`, and a single unauthorized or unexpected autonomous action is
enough to fail this criterion for the release in which it occurred,
independent of how rare it is. Trust criteria are asymmetric by design:
many correct autonomous actions do not offset one incorrect one.

### 6. Documentation stays true

The documentation-lint/CI process
(`docs/26-system-reference/11-documentation-lint-ci.md`) reports no
unresolved drift between `docs/` and the implementation at release time.
A correct implementation with a stale spec is, for the purposes of this
criterion, the same failure as an incorrect implementation — both mean a
future reader (human or AI) cannot trust the docs, which undermines the
entire documentation-first premise this project is built on.

### 7. The system is buildable by an AI agent using only `docs/`

An AI implementer, given the documentation in this repository and no
other context, can implement a previously-unbuilt feature that conforms
to its contract and passes its acceptance criteria on the first or
second attempt, without inventing undocumented design decisions. This is
the criterion that validates Section 32's AI Implementation Protocol
actually works, not just that it's well-specified.

## Non-criteria

Velocity, lines of code, and feature count are explicitly not success
criteria. A feature that is fast to ship but violates Criterion 1 or 5
is a failure regardless of how quickly it shipped; see `non-goals.md`
for the tradeoffs this project deliberately declines to make in the name
of speed.

## Review cadence

These criteria are reviewed at every major version boundary
(versioning discipline per Section 25 of the master outline;
`docs/15-decisions/adr-0008-v5-architecture-evolution.md`
is the template for how a criterion changing over time gets recorded as
a decision, not a silent edit).
