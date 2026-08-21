# Implementation Rules

## Purpose

The governance-layer summary of how code gets written, day to day —
distinct from `architecture-lock.md` (how subsystems relate to each
other) and `technology-lock.md` (what it's built with). This file
answers "given the architecture and the stack, what does 'good' look
like at the function and module level." Full reasoning lives in
`docs/00-overview/engineering-principles.md` and `docs/14-development/coding-standards.md`; this file is the checklist
version.

## Scope

Every line of code in the repository, human-written or AI-generated.

## Required

- Follow the relevant contract
  (`docs/26-system-reference/15-build-contracts.md` or the component's
  own doc) before writing any implementation — see
  `code-generation-rules.md`, Phase 1.
- Validate every input at every boundary — internal API, tool
  invocation, event payload — using the schemas locked in
  `technology-lock.md` (Zod).
- Keep modules loosely coupled, per `architecture-lock.md`'s
  communication rule — no reaching into another module's internals.
- Prefer composition over inheritance, per
  `docs/00-overview/engineering-principles.md`, Principle 3.
- Every public API has tests before it is considered complete — see
  `definition-of-done.md`.
- Every async operation supports cancellation, per
  `docs/00-overview/engineering-principles.md`, Principle 5.
- Every mutation emits an event, per `docs/00-overview/system-invariants.md`.
- Every persisted schema is versioned, per
  `docs/26-system-reference/20-versioning-contracts.md`.
- Use the Result pattern for expected failures; reserve exceptions for
  unexpected, non-recoverable conditions — see
  `docs/14-development/error-handling-tagging-and-performance-rules.md`.

## Forbidden

- No hidden global state — every dependency is passed explicitly
  (`docs/14-development/library-and-pattern-rules.md`).
- No circular dependencies, including indirect cycles through the event
  bus (`docs/02-architecture/dependency-rules.md`).
- No magic numbers — numeric constants with cross-cutting meaning (a
  timeout, a retry count, a resource limit) live in
  `docs/26-system-reference/19-ordering-concurrency-and-retry-rules.md`
  or the component's own config, never inlined.
- No hardcoded strings for anything that is a contract value (event
  names, error codes, capability names) — these are imported from their
  canonical schema, never retyped.
- No duplicated business logic — a rule implemented in two places is a
  defect even if both copies are currently correct.
- No silent failures — see `docs/00-overview/engineering-principles.md`,
  Principle 7.
- No direct database access outside the owning repository layer
  (`docs/13-devops/persistence.md`).
- No plugin access to core internals (`project-constraints.md`).

## Relationship to other governance files

This file states the rules; `code-generation-rules.md` states the
process an AI agent follows to apply them while writing code;
`quality-gates.md` and `implementation-checklist.md` state how
compliance is checked before a change is considered done.
