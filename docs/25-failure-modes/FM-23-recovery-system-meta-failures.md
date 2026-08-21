# FM-23: Recovery System (Meta-Failures)

## Purpose

The recovery mechanisms described throughout `docs/03-runtime/failure-recovery.md` and referenced across every file in this folder can themselves fail. This file exists specifically to prevent the trap of treating 'we have a recovery mechanism' as equivalent to 'recovery will actually work' — every recovery path needs to be tested as rigorously as the feature it protects.

## Scope & Related Documents

This file is part of `docs/25-failure-modes/`, the project-wide failure-mode catalog. It must be read alongside:

- `docs/03-runtime/failure-recovery.md` - `docs/13-devops/recovery.md` - `docs/12-testing/chaos-tests.md` - `docs/13-devops/incident-response.md` - `docs/13-devops/runbook.md`

## Failure Catalog

Each failure is assigned a stable ID (`FM-23-0XX`) for cross-referencing from code comments, incident reports, and other failure-mode files.

| ID | Failure | Trigger Condition | Detection | Severity | Mitigation (prevent) | Recovery (respond) |
|---|---|---|---|---|---|---|
| **FM-23-001** | Retry makes things worse | A retried action compounds the damage of the original failure (e.g. retrying a non-idempotent 'charge payment' action). | Post-incident audit finds duplicate real-world side effects traceable to a retry. | Critical | Never auto-retry a non-idempotent action without an idempotency key the downstream system honors; classify every action's idempotency explicitly at design time via the mandatory `idempotent` field (`docs/06-tools/tool-interface.md`). | Reconcile/reverse the duplicated side effect if possible (refund, cancel duplicate); treat as a critical incident and audit all other retry-eligible actions for the same gap. |
| **FM-23-002** | Recovery loops forever | The recovery procedure itself fails, triggers another recovery attempt, which fails the same way, indefinitely. | Recovery-attempt count for a single incident exceeds a sane ceiling. | Critical | Bounded recovery attempts with escalation to human intervention after the ceiling, same principle as FM-02-008's task-loop ceiling. | Halt automated recovery attempts, surface the full failure history to a human operator, and require manual diagnosis before further automated attempts. |
| **FM-23-003** | Recovery incomplete | Recovery procedure restores most, but not all, of the affected state, and reports success anyway. | Post-recovery integrity check (not just 'the recovery script exited 0') finds residual inconsistency. | High | Verify recovery completeness against an explicit checklist/invariant check, never trust the recovery procedure's own self-reported success (same principle as FM-05-016's independent-verification requirement). | Run the completeness check, identify the specific gap, and run a targeted follow-up recovery for just that gap. |
| **FM-23-004** | Wrong checkpoint restored | Recovery restores from an older checkpoint than necessary, losing more recent valid work than required. | Restored state is missing changes that were actually durably committed after the chosen checkpoint. | Medium | Always restore from the most recent valid checkpoint, verified by integrity check, not just the most recent checkpoint that exists. | Replay any recoverable event-log entries between the restored checkpoint and the actual failure point, if the log survived. |
| **FM-23-005** | Rollback partially succeeds | Same failure mode as FM-15-023 and FM-14-015, called out here as the general recovery-system risk it represents across every rollback-capable subsystem in NOVA. | Post-rollback state doesn't cleanly match either the pre- or post-change state. | High | Transactional (all-or-nothing) rollback as a hard architectural requirement for every subsystem that offers rollback, not an aspiration for some. | Restore from the last fully-verified checkpoint rather than attempting to hand-patch a partially-rolled-back state; this is the same recovery-of-recovery pattern as FM-23-003. |

## Compounding Failures

Notes on how failures in this file interact with failures elsewhere in this catalog — read these before assuming a bug is isolated to one subsystem.

- This entire file is a compounding-failure category by definition: every entry here means a primary failure (from any other file in this folder) plus a recovery mechanism that didn't hold — which is strictly worse than the primary failure alone, since the system's own safety net is what failed. This is why `docs/12-testing/chaos-tests.md` must specifically exercise recovery paths, not just primary-path behavior.

## Severity Legend

- **Critical** — data loss, security compromise, or user-visible harm; requires an incident-response runbook, not just a bug ticket.
- **High** — silent incorrectness, significant user-visible breakage, or a failure that blocks task completion with no graceful degradation.
- **Medium** — degraded quality/UX or a failure with a working but imperfect fallback.
- **Low** — cosmetic, rare, or fully recoverable with negligible user impact.
