# Quality Gates

## Purpose

The automated and human checks a change passes through before it can be
merged — distinct from `definition-of-done.md` (what "done" means for
the task) in that this file states the actual gates that verify it
mechanically, in the order they run.

## Scope

Every change to code, schemas, or `docs/`. A documentation-only change
still passes the documentation-specific gates below.

## The gates, in order

### Gate 1 — Governance compliance

- No item from `forbidden-decisions.md` is present.- `technology-lock.md` and `architecture-lock.md` are respected.
- Any deviation is backed by a merged ADR (`docs/15-decisions/`), not
  pending or implied.

Failing this gate blocks all subsequent gates — a change that violates
governance is not evaluated further until fixed, per
`ai-constitution.md`.

### Gate 2 — Build and static checks

- Compiles/builds with zero errors (`docs/05-ai/verification-and-stop-conditions.md`).
- Lint and static analysis produce zero blocking violations
  (`docs/14-development/coding-standards.md`).
- No forbidden import or circular dependency
  (`docs/02-architecture/dependency-rules.md`).

### Gate 3 — Tests

- All tests pass at the coverage threshold in
  `docs/12-testing/testing-strategy.md`.
- No test was skipped or newly disabled to make this gate pass.
- A new failure mode or edge case introduced by this change has a
  corresponding test in `docs/37-edge-cases/` or `docs/25-failure-modes/`, per that directory's own requirement.

### Gate 4 — Contract and invariant conformance

- The implementation matches its component's contract
  (`docs/26-system-reference/15-build-contracts.md`) exactly, not
  approximately.
- No invariant in `docs/00-overview/system-invariants.md` is violated.- No constraint in `project-constraints.md` is violated.
- Every mutation emits the event it's required to
  (`docs/26-system-reference/17-event-and-internal-api-contracts.md`).

### Gate 5 — Performance and resource budgets

- No ceiling in
  `docs/14-development/error-handling-tagging-and-performance-rules.md` or `docs/39-performance-budgets/` is exceeded, per
  `docs/39-performance-budgets/benchmarks.md`.

### Gate 6 — Documentation consistency

- If behavior diverged from the spec during implementation, the spec is
  updated in the same change (`ai-constitution.md`, Rule 1).
- `docs/26-system-reference/11-documentation-lint-ci.md`'s checks pass —
  no broken cross-reference, no stale description.

### Gate 7 — Review

- `implementation-checklist.md` has been completed.- `docs/43-ai-development/review-checklist.md` has been completed.
- For changes above the risk threshold defined in
  `docs/23-autonomy/`, human review is required and recorded.

## What a gate failure means

A gate failure is not a warning to note and proceed past — the change
does not advance to the next gate, let alone merge, until it's fixed.
There is no "merge now, fix the gate later" path in this repository.
