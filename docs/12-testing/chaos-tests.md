# Chaos Tests

## Purpose

Deliberately injects faults into a running test instance to confirm the
failure-recovery mechanisms in `docs/03-runtime/failure-recovery.md`
behave as documented under real disruption — the layer that exercises
faults the test author did not necessarily anticipate, complementing
`simulation-tests.md`'s recorded-scenario approach.

## Scope

Fault-injection testing specifically. Recorded real-task replay for
correctness/quality regression is `simulation-tests.md`; this document is
about deliberately breaking things to confirm recovery.

## Fault categories injected

- **Process kill** — terminating a supervised service process
  (`docs/03-runtime/runtime-manager.md`) at a randomized or specifically
  targeted point (mid-checkpoint, mid-tool-invocation, mid-verification)
  to confirm Runtime Manager's restart behavior and Task Manager's
  crash-recovery state marking (`docs/02-architecture/lifecycle.md`)
  behave as documented.
- **Message corruption/loss** — dropping or corrupting a Communication
  Bus message to confirm dead-letter handling
  (`docs/02-architecture/communication-model.md`) and consumer-side
  idempotency actually engage rather than causing silent data
  inconsistency.
- **Resource lock starvation** — deliberately holding a resource lock
  past its expected duration to confirm the Resource Manager's
  force-release backstop (`docs/03-runtime/resource-manager.md`) engages.
- **Permission denial mid-flow** — denying a confirmation prompt at an
  unusual point (e.g., after a multi-step task has already completed
  several steps) to confirm partial-completion reporting
  (`docs/03-runtime/executor.md`) and rollback/compensation
  (`docs/03-runtime/failure-recovery.md`) behave correctly, not just when
  denial happens at the very first step.
- **Plugin crash** — deliberately crashing a plugin process to confirm
  sandboxing isolation (`docs/16-extensibility/plugin-sandboxing.md`)
  actually contains the failure to that plugin alone.
- **Storage corruption** — corrupting a test storage engine to confirm
  the disaster-recovery sequence in `docs/13-devops/recovery.md`
  triggers correctly.

## Success criteria

A chaos test passes when the injected fault results in one of the
documented, acceptable outcomes (a task correctly marked `Unverified` or `Failed`, a service correctly restarted, a lock correctly force-released)
— never a silent inconsistency, an unhandled crash of an unrelated
component, or data corruption. A chaos test that reveals an undocumented
or incorrect recovery behavior is treated as a defect
(`docs/14-development/technical-debt.md`) or, if it reveals a genuine
architectural gap, escalated toward a new ADR
(`docs/15-decisions/adr-template.md`).

## Cadence

Chaos tests run less frequently than the other four layers, given their
higher setup cost and the disruptive nature of the faults involved —
scheduled per release (feeding `docs/14-development/release-checklist.md`)
rather than on every change, though a change specifically touching
failure-recovery logic triggers a targeted chaos test run as part of its
own review.

## Related documents

- `docs/25-failure-modes/FM-08-code-generation-and-testing.md` — failure modes for this subsystem
- `testing-strategy.md` — this layer's place in the overall model
- `docs/03-runtime/failure-recovery.md` — the mechanisms this layer
  validates
- `docs/14-development/release-checklist.md` — where chaos test results
  are checked before shipping
