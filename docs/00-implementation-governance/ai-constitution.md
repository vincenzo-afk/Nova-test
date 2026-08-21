# AI Constitution

## Status

This is the canonical, detailed version of the Constitution. A short
pointer copy lives at the repository root (`/CONSTITUTION.md`) purely
for discoverability — anyone opening the repo for the first time sees
it immediately. This file is the one that is normative; if the two
ever appear to differ, this file wins and the root copy is stale and
must be fixed in the same change that edited this one.

This is the single highest-precedence rule set in this repository.
Every AI agent — and every human contributor — reads this before
writing any code, editing any document, or making any implementation
decision. Where any other document appears to conflict with this one,
this document wins; where this document is silent, defer to
`documentation-precedence.md` for how the rest of the documentation
resolves precedence among itself.

## Why this document exists

Most defects an AI implementer introduces into a documentation-first
repository are not bugs in the conventional sense — they are
undocumented decisions made silently and confidently. This constitution
exists to make that failure mode structurally harder: not by asking for
more care, but by stating a small number of absolute rules that leave no
room for a "reasonable-sounding" exception.

## The rules

### 1. Documentation is the single source of truth

If `docs/` and the running code disagree, `docs/` is not automatically
right — but the disagreement itself is a defect that must be resolved
explicitly (fix the code, or fix the doc with a recorded reason,
`docs/15-decisions/`) — never left standing, and never resolved by
quietly trusting whichever one you looked at first.

### 2. Do not invent architecture

If a design decision is not documented, that is a gap in the
documentation, not an invitation to design a solution and move on. See
`docs/00-overview/ai-implementation-philosophy.md`.

### 3. Do not substitute technologies

Every technology choice in `technology-lock.md` is locked. A
better-seeming alternative is not a reason to deviate; it is a reason to
propose an ADR (`docs/15-decisions/`) and wait for a human decision.

### 4. Do not rename public APIs or events

The names in `docs/08-api/`, `docs/26-system-reference/07-event-catalog.md`,
and `docs/26-system-reference/14-data-models.md` are contracts other
components, other agents, and external integrators depend on literally.
A rename — even one that is objectively clearer — is a breaking change
subject to `docs/26-system-reference/20-versioning-contracts.md`, never
a drive-by cleanup.

### 5. Do not infer missing requirements

An underspecified requirement is resolved by asking, per
`ambiguity-policy.md` — never by picking the interpretation that seems
most likely to be right.

### 6. Do not optimize by changing documented behavior

A performance or elegance improvement that changes what a component
does, as opposed to how it does it internally, is a behavior change and
requires the same specification update and review as any other behavior
change — speed is never a justification for silent scope creep.

### 7. If documentation conflicts, stop and report it

A contradiction between two documents is not resolved by picking the one
that seems more authoritative, more recent, or more convenient for the
current task. It is reported as a documentation defect
(`docs/26-system-reference/11-documentation-lint-ci.md`) and, if it
blocks the current task, escalated per `ambiguity-policy.md`. See
`docs/00-implementation-governance/documentation-anti-patterns.md` for
the recurring shapes this kind of conflict actually takes — recognizing
the pattern early is faster than discovering it mid-implementation.

### 8. If information is missing, ask instead of assuming

See `ambiguity-policy.md` for the full flow. There is no phrasing of "I
assumed..." that satisfies this rule.

### 9. All generated code must satisfy its contracts, invariants, and tests before it is considered complete

See `definition-of-done.md` and `quality-gates.md` for the exact,
checkable criteria — "complete" is never a subjective judgment call.

## Precedence

1. This Constitution
2. `docs/00-overview/system-invariants.md` and `project-constraints.md`
3. Component contracts and the master documentation outline (`docs/`)
4. Individual PR/task-level judgment calls (Optional-class decisions
   only, per `decision-authority-matrix.md`)

## Acknowledgment

Any AI agent beginning work in this repository treats reading this
document — and every other file in
`docs/00-implementation-governance/` — as Phase 0 of the AI
Implementation Protocol, before Phase 1 ("Understand") in
`docs/43-ai-development/implementation-order.md` begins.
