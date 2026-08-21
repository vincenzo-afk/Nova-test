# Validation and Acceptance Criteria

## Purpose

Defines the checklist a component must satisfy before it is considered
complete, tying together the five testing layers in `testing-strategy.md`
into one concrete "done" definition — directly addressing the ambiguity
this project's foundational review identified in an architecture where
nothing had a clear completion criterion.

## Scope

Acceptance criteria applicable across all components. Component-specific
functional requirements are defined in each component's own architecture
document.

## Universal acceptance checklist

Every component, regardless of layer, must satisfy:

1. **Documented behavior matches implemented behavior** — the component's
   architecture document in this repository is the specification; a
   discrepancy is a defect in the code, not a reason to consider the
   documentation outdated, unless a deliberate ADR-approved change was
   made (`docs/15-decisions/`, Tier 3).
2. **Unit test coverage** for all documented decision logic and error-
   handling paths (`unit-tests.md`).
3. **Integration test coverage** for its message contracts and
   dependencies (`integration-tests.md`).
4. **Structured result compliance**, where applicable (any tool or
   Executor-invoked component) — full conformance to
   `docs/06-tools/tool-interface.md`'s schema, with no unattested "done"
   responses.
5. **Risk-tier and permission compliance**, where applicable — any
   component capable of a state-changing action correctly reports its
   risk tier and respects the Permission Manager gate
   (`docs/10-security/permissions.md`).
6. **Performance target compliance**, where applicable — measured against
   `docs/11-performance/performance-goals.md` via the benchmark suite
   (`docs/11-performance/benchmarks.md`, whose CI/test-execution
   integration is described in this directory's own
   `docs/12-testing/benchmarks.md` — the two are the same suite, not
   competing ones).
7. **Audit trail compliance** — any autonomous action the component can
   trigger is fully traceable via `docs/10-security/audit.md`'s
   `correlation_id` mechanism.

## Task-level acceptance (Task Success Score)

Independent of component-level acceptance above, individual task
executions are scored against the Task Success Score defined in
`docs/01-product/success-metrics.md` — component acceptance and
task-execution scoring are related but distinct: a fully compliant
component can still produce an individual task outcome scored as
"Unverified" or "recovered," which is expected and correctly handled
behavior, not a component defect.

## Phase-gate validation

Per `ROADMAP.md`, no phase begins implementation before the phase before
it passes this validation checklist in full — the module checklist in
`docs/14-development/module-checklist.md` (Tier 3) operationalizes this
requirement at the individual pull-request level.

## Related documents

- `docs/25-failure-modes/FM-08-code-generation-and-testing.md` — failure modes for this subsystem
- `testing-strategy.md` — the five testing layers this checklist draws
  from
- `docs/06-tools/tool-interface.md`, `docs/10-security/permissions.md` —
  specific compliance requirements referenced above
- `docs/01-product/success-metrics.md` — the separate, task-level scoring
  model
