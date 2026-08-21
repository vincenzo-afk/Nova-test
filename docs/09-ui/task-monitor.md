# Task Monitor

## Purpose

Displays live progress for in-flight tasks and history for recently
completed ones, directly implementing the "every task displays current
step, completed steps, remaining steps, status, verification result"
requirement established for this project — so a long-running autonomous
workflow never appears to the user as an unexplained silent wait.

## Scope

Task Monitor-specific display logic. The underlying state machine is
`docs/03-runtime/task-manager.md`; live updates are delivered via the
mechanism described in `docs/08-api/internal-api.md`.

## Displayed information per task

- Current step and its description in plain language (not raw tool
  identifiers).
- Completed steps, each showing its verification outcome
  (Completed/Unverified/Failed, per `docs/03-runtime/verifier.md`) —
  never collapsed into a single generic checkmark that would hide an
  Unverified outcome as if it were a clean success.
- Remaining steps, where known in advance (a fully planned multi-step
  task) versus "planning next step" (where the Planner has not yet
  determined the remainder, per its iterative replanning model,
  `docs/03-runtime/planner.md`).
- Any pending confirmation the task is blocked on
  (`docs/03-runtime/permission-manager.md`), presented prominently rather
  than as a silent block — this is the `WaitingUser` state
  (`docs/03-runtime/task-manager.md`), visually distinguished from a
  general `Paused` state, since only `WaitingUser` requires a specific
  confirmation action rather than a plain resume.
- A visible retry indicator and count whenever a task is in the
  `Retrying` state, rather than the retry attempt being invisible to the
  user.
- A `WaitingResources` indicator when a task is queued behind another
  task's resource lock (`docs/03-runtime/resource-manager.md`), so the
  user understands why an otherwise-ready task has not started executing.

## Cancellation control

A visible, always-available cancel control per in-flight task, invoking
`docs/03-runtime/task-manager.md`'s cancellation path — the Task Monitor
does not hide this control for tasks "in the middle of something," since
safe-pause handling is the Task Manager's responsibility to guarantee
regardless of when cancellation is requested.

## Recovered-task indication

Per `docs/01-product/success-metrics.md`'s distinction between a clean
success and a "recovered" success (one that passed through Unverified or
Failed before eventually completing), the Task Monitor visually
distinguishes these two outcomes rather than presenting both as identical
green checkmarks — a recovered task's history remains visible on request
even after it reaches Completed.

## Related documents

- `docs/25-failure-modes/FM-22-user-interaction-and-analytics.md` — failure modes for this subsystem
- `docs/03-runtime/task-manager.md` — the state machine this surface
  renders
- `docs/03-runtime/verifier.md` — the verification outcomes displayed per
  step
- `docs/01-product/success-metrics.md` — the recovered-vs-clean success
  distinction
