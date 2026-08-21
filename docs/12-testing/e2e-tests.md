# End-to-End Tests

## Purpose

Verifies the complete observation-to-verified-result pipeline against a
real (isolated, disposable) test OS environment — the layer that exercises
actual filesystem operations, actual (sandboxed) application interaction,
and actual verification signals, rather than test doubles.

## Scope

Full-pipeline testing against a real test environment. Cross-service
message-contract testing without a real OS environment is
`integration-tests.md`; testing against realistic, messy real-world
scenarios specifically is `simulation-tests.md`.

## Test environment

A disposable virtual machine snapshot, reset between test runs, with a
known set of installed applications and file structures — this isolation
is required specifically because end-to-end tests perform real file
operations and, for GUI-tier tests, real (automated) application
interaction, which must never run against a developer's actual working
environment or the production allow-listed application set without
explicit isolation.

## Representative end-to-end scenarios

Covering the use cases in `docs/01-product/use-cases.md` end to end:

- A deterministic file-operation task, verified via real filesystem state
  and exit codes.
- A reasoning-required summarization task, verified via grounding-
  reference checks against the actual retrieved test-fixture memory
  records.
- A multi-step task with a deliberately injected mid-task failure,
  verified against the recovery/replanning behavior in
  `docs/03-runtime/planner.md`.
- A GUI-automation task against an allow-listed test application,
  verified via both accessibility-tree state and, where applicable,
  vision-based secondary verification, per
  `docs/03-runtime/verifier.md`'s hierarchy.

## Crash-recovery testing

Per `docs/02-architecture/lifecycle.md`, end-to-end tests include
deliberately terminating the NOVA process mid-task and confirming the
subsequent restart correctly marks in-flight work as `Unverified` rather
than silently resuming as if nothing happened, and that memory/graph
integrity checks behave as documented.

## Confirmation-gate testing

A destructive-tier action is tested end-to-end through an actual
confirmation prompt round-trip (simulated user response), confirming the
full path from Permission Manager's gate through to either execution or
clean blocking behaves as documented in `docs/10-security/permissions.md`.

## Related documents

- `docs/25-failure-modes/FM-08-code-generation-and-testing.md` — failure modes for this subsystem
- `testing-strategy.md` — this layer's place in the overall model
- `docs/01-product/use-cases.md` — the scenarios this layer covers
  end-to-end
- `simulation-tests.md` — the next layer, focused on realistic-scale and
  recorded-scenario testing
