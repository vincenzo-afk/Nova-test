# Coding Standards

## Purpose

Establishes the code-level conventions every contribution must follow,
supporting the documentation-first workflow described in `CONTRIBUTING.md`
by ensuring code structure mirrors the architecture documented in this
repository closely enough that a reader can navigate between the two.

## Scope

Code-level style and structural conventions. Architectural non-
negotiables (deterministic-first, risk-tiering, execution priority) are
`architecture-rules.md`.

## Module structure mirrors documentation structure

Each service documented in `docs/03-runtime/` corresponds to one
top-level module in the codebase, named identically (e.g., the `planner` module implements `docs/03-runtime/planner.md`) — a reader jumping from
documentation to code must never need to guess which module
corresponds to which document.

## Structured result types, not loosely-typed returns

Per `docs/06-tools/tool-interface.md`, every tool integration's return
type is a strongly-typed structure matching that document's schema, not a
generic dictionary or loosely-typed object — this is enforced at compile/
type-check time wherever the implementation language supports it, not
merely as a documented convention contributors are trusted to follow.

## Explicit risk-tier and verification-signal declaration

Per `docs/06-tools/tool-interface.md`'s hard rule, a tool registration
that omits its verification signal must compile/register successfully
only into the restricted "confirmation-required-only" category — the
type system or registration validation must make it structurally
difficult to accidentally register a tool as unattended-eligible without
explicitly declaring a real verification signal.

## Correlation ID propagation

Every function signature that participates in the request-to-result
pipeline (`docs/02-architecture/execution-pipeline.md`) accepts and
propagates the task's `correlation_id` explicitly — this is treated as a
required parameter, not an optional one silently dropped in helper
functions, since the audit trail (`docs/10-security/audit.md`) depends on
this propagation being complete, not best-effort.

## Error handling

Every error is either handled explicitly at the point it occurs or
propagated as a structured, typed error up to a boundary documented to
handle it — no silent catch-and-ignore blocks, consistent with the
"never assume success" philosophy running throughout the Verifier
(`docs/03-runtime/verifier.md`) and Task Success Score
(`docs/01-product/success-metrics.md`) design.

## Related documents

- `architecture-rules.md` — the architectural non-negotiables this
  standard supports
- `docs/06-tools/tool-interface.md` — the schema these standards enforce
  at the type level
- `module-checklist.md` — the PR-level checklist verifying these
  standards
- `import-rules.md` — code-level import/layering conventions this standard is a companion to
- `dependency-policy.md` — adding a new third-party dependency
- `directory-contract.md` — where a new file belongs
