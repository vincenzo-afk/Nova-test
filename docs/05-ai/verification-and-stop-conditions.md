# Verification Contracts & Stop Conditions

## Purpose

States the exact pipeline every piece of AI-produced work passes through
before being accepted, and the exact conditions under which the Planner
stops iterating rather than continuing indefinitely — per Sections 19
and 20 of the master documentation outline.

## Scope

The verification pipeline stages and their pass/fail semantics; the
enumerated stop conditions for any iterative planning/execution loop.
Does not cover the Verifier component's internal implementation
(`docs/03-runtime/verifier.md`) beyond what's needed to state the
contract.

## Verification pipeline

Every implementation-producing task passes through these stages, in
this fixed order, and a failure at any stage halts progression to the
next stage rather than proceeding "best effort":

```
Implementation
   ↓
Compile / build check
   ↓
Automated tests
   ↓
Lint
   ↓
Static analysis
   ↓
Review (automated + policy checks)
   ↓
Reflection (self-critique against the original contract)
   ↓
Accept
```

- **Compile/build:** must succeed with zero errors; warnings are logged
  but do not block by default unless the project's configuration
  (`docs/14-development/configuration-schema.md`) marks specific
  warnings as blocking.
- **Tests:** must pass at the coverage threshold defined in
  `docs/12-testing/testing-strategy.md`; a skipped or newly-disabled
  test is treated as a failure, not a pass.
- **Lint / static analysis:** must produce zero violations of rules
  marked blocking in `docs/14-development/coding-standards.md`.
  Non-blocking rule violations are logged for review, not silently
  ignored.
- **Review:** automated policy checks (no forbidden imports, no
  bypassed permission checks, per `constraints.md`) plus, where
  configured, human review for changes above a risk threshold.
- **Reflection:** the agent explicitly re-checks its own output against
  the original contract using the Phase 4 self-review checklist
  (`docs/43-ai-development/review-checklist.md`) — this stage cannot be
  skipped even when every prior stage passed, since prior stages check
  mechanical correctness, not intent-match.
- **Accept:** only reachable after every prior stage passes; there is no
  path to "accept" that skips a stage.

A stage that cannot run (e.g., no test runner configured) is treated as
a failed stage, not a skipped one — see `docs/25-failure-modes/` for how
an unrunnable verification stage itself becomes an escalation.

## Stop conditions

An iterative loop (planning, self-repair, refinement) stops when any of
the following is true, whichever comes first:

- **Task complete:** the Verifier has accepted the final output against
  its original contract.
- **Confidence threshold reached and stable:** confidence exceeds the
  threshold in `decision-and-confidence-contracts.md` for two
  consecutive iterations without further improvement — a single
  high-confidence pass is not sufficient on its own if the prior pass
  was markedly lower, since that pattern can indicate an unstable
  estimate rather than genuine convergence.
- **No further improvement detected:** the last N iterations (default 2)
  produced no measurable change in the Verifier's score.
- **Budget exhausted:** the task's configured time, token, or retry
  budget (`19-ordering-concurrency-and-retry-rules.md`) is reached.
- **Human approval required and not yet given:** the loop pauses, it
  does not continue speculatively while waiting.

Whichever condition triggers, the loop always terminates in one of three
states — Accepted, Escalated, or Aborted-with-reason — never in a silent
timeout with no recorded outcome. Infinite iteration is prevented
structurally by the budget-exhausted condition being unconditional: it
always fires eventually regardless of what any other condition does.

## Maintenance rule

A new iterative process introduced anywhere in NOVA must declare, for
each of the five stop conditions above, whether it applies to that
process and how — this declaration is not optional even when the answer
is "does not apply." **Budget exhausted** applies unconditionally to
every iterative process, with no exception (it is what prevents infinite
iteration structurally, per the paragraph above) — a process's
documented budget may be process-specific, but the condition itself must
always be present. The other four conditions may legitimately not apply
to a given process (e.g., a process with no human-approval gate simply
never has a "Human approval required" condition to declare) — but that
non-applicability must be stated explicitly in the process's own
documentation, not left implicit. A loop with no documented stop
condition, or with an undeclared applicability for any of the five, is
treated as a defect, per `docs/37-edge-cases/workflow-loop.md`.

## Related documents

- `docs/25-failure-modes/FM-05-llm-core-and-ai-specific-failures.md` — failure modes for this subsystem
