# Failure Recovery

## Purpose

Consolidates NOVA's failure-recovery mechanisms — retries, rollback,
compensation, checkpoints, crash resumption, partial completion handling,
idempotency, and timeout strategy — into one authoritative reference.
Several of these were previously implicit across multiple documents; this
document makes each mechanism explicit and names where it is implemented.

## Scope

Recovery mechanics for task execution failures. Storage-level disaster
recovery (corrupted memory/graph storage) is `docs/13-devops/recovery.md`;
this document covers task- and step-level failure handling.

## Retries

Governed by the `Retrying` state in `docs/03-runtime/task-manager.md`, bounded by the step/time budget in
`docs/03-runtime/planner.md`. A retry re-attempts the failed step, not
the entire task, using the Planner's existing "reuse completed work"
logic — prior successful steps are not redone.

## Rollback

For reversible-write actions, the undo mechanism established in
`docs/01-product/feature-priority.md` and enforced via `docs/06-tools/tool-interface.md`'s structured result (which records
`affected_resources`) provides the basis for rollback: reversing a
specific action restores the pre-action state captured at execution
time. Rollback is invoked automatically only when a Failed step's partial
effects would otherwise leave the system in an inconsistent state (see
Compensation below); otherwise, completed steps are left in place and
surfaced to the user per Task Manager's partial-completion reporting.

## Compensation

For a multi-step task where an earlier step cannot be cleanly rolled back
(e.g., a file already moved as part of step 2 of a task that fails at
step 4), NOVA applies a **compensating action** — a distinct forward
action that returns the system to a consistent state — rather than
attempting a literal undo. Compensating actions are declared per tool
where relevant (an extension of `docs/06-tools/tool-interface.md`'s
schema: an optional `compensation_action_id` field), and the Planner
selects the compensating action rather than assuming every action has a
literal inverse.

## Checkpoints

For long-running, multi-step tasks, Task Manager persists a checkpoint
after every step transition (not only at task completion), per
`docs/03-runtime/task-manager.md`'s incremental persistence. A checkpoint
captures the task's full state — completed steps, their results, and
current Working Memory context — sufficient to resume from that exact
point rather than replanning from scratch.

A checkpoint has exactly three states, referenced by
`docs/26-system-reference/16-lifecycle-and-state-machine-index.md`:
**Created** (written, immediately usable for resumption), **Valid**
(the most recent checkpoint for its task — the one resumption actually
uses), and **Superseded** (an older checkpoint for the same task,
retained per the audit-trail window but no longer the resumption
target). A checkpoint is never mutated in place once created — a new
step transition always writes a new checkpoint and marks the previous
one Superseded, rather than updating it, so a checkpoint's content is
always exactly what existed at the moment it was taken.

## Resume after crash

Per `docs/02-architecture/lifecycle.md`, a task in `Executing` or `Verifying` at crash time is marked `Unverified` on restart, since its
true outcome cannot be confirmed. A task in `Paused` or `WaitingUser` at
crash time resumes into that same state, since it was not mid-action when
the crash occurred (`docs/03-runtime/task-manager.md`).

## Partial completion

Per `docs/03-runtime/executor.md`'s `status: "partial"` result type, a
multi-step tool action that partially succeeds reports exactly which
sub-steps completed. The Planner uses this to decide whether to resume
from the failure point, apply a compensating action, or report the
partial state to the user — never silently treating partial completion
as either full success or full failure.

## Idempotency

Every tool invocation is expected to be safely retryable without
duplicating its effect — per `docs/02-architecture/communication-model.md`'s
`message_id`-based deduplication convention, applied here to tool
execution specifically: a retried step carries the same step identifier,
and a tool implementation must treat a repeated invocation with the same
identifier as a no-op if the original invocation's effect is detected to
have already occurred (checked via the tool's own verification signal
before re-executing).

## Timeout strategy

Every step has a configured maximum duration, scaled by risk tier and
execution tier (a Vision-tier step is allowed more time than a Native
Runtime call, per the latency expectations in
`docs/11-performance/performance-goals.md`). A step exceeding its timeout
is treated as `Failed` with a timeout-specific reason, entering the same
`Retrying` path as any other failure, not left hanging indefinitely.

## Failure taxonomy

Every failure is classified into exactly one of the following categories,
recorded alongside the `Failed` or `Unverified` state
(`docs/03-runtime/task-manager.md`) so that recovery strategy and,
where relevant, incident severity (`docs/13-devops/incident-response.md`)
can be determined from the category rather than free-text error
inspection:

- **Transient** — expected to succeed on retry with no change (a
  momentary network blip, a provider rate limit). Routed to `Retrying`
  automatically within the normal retry budget.
- **Permanent** — will not succeed on retry without a change in
  approach (a tool that genuinely cannot perform the requested action).
  Routed to the Planner for replanning with an alternate method, not a
  bare retry of the same failed approach.
- **User** — caused by ambiguous, incomplete, or contradictory user
  input (`docs/05-ai/ambiguity-resolution.md`'s "ask the user" branch,
  or `docs/04-memory/memory-conflict-resolution.md`'s contested-fact
  case). Requires user clarification, not automated retry.
- **External** — caused by a third-party system's behavior outside
  NOVA's control (an API contract change, an MCP server misbehaving).
  Handled per `docs/00-overview/assumptions.md`'s "external APIs change"
  and "MCP servers may be poorly implemented" assumptions.
- **Security** — a permission or sandboxing boundary was enforced
  correctly, blocking an action (not a bug — this category exists to
  distinguish an intentional block from an unintended failure). Routed
  to Permission Manager's normal denial handling
  (`docs/03-runtime/permission-manager.md`), never silently retried.
- **Validation** — input or schema validation failure (a tool
  registration missing required metadata, per
  `docs/06-tools/tool-interface.md`; a malformed API request). Rejected
  at the validation boundary, never partially processed.
- **Internal** — a defect in NOVA's own code (an invariant violation,
  per `docs/00-overview/system-invariants.md`, or an unhandled
  exception). Always logged for `docs/14-development/technical-debt.md`
  tracking or immediate fix, never silently swallowed.

A failure that does not clearly fit one category defaults to **Internal**
— an unclassifiable failure is treated as a defect in NOVA's own error
handling (something should have classified it) rather than left
uncategorized.

## Tool retry matrix

The failure category above determines the default recovery action,
concretely:

| Failure category | Default recovery action |
|---|---|
| Transient (network blip, provider rate limit) | Retry automatically, bounded, per this document's Retries section |
| Permanent (tool cannot perform the action at all) | No retry of the same approach; Planner replans with an alternate tool/capability |
| User (ambiguous/contradictory input) | Route to `docs/05-ai/ambiguity-resolution.md`; no automated retry |
| External (third-party API/MCP/plugin misbehavior) | Retry once with backoff, then treat as Permanent for that specific provider and fall back per `docs/05-ai/model-routing-matrix.md` or `docs/05-ai/tool-selection.md`'s next-ranked candidate |
| Security (permission correctly denied) | No retry — route to `docs/03-runtime/permission-manager.md`'s denial handling |
| Validation (malformed input/schema) | No retry of the same input; reported to Planner, which must produce corrected parameters, not blindly resubmit |
| Internal (defect) | No automatic retry beyond the standard bounded retry; always logged for `docs/14-development/technical-debt.md` |

This table is the concrete instantiation of
`docs/03-runtime/planner-executor-contract.md`'s `error.category` field
— the Planner's replan decision reads this field directly rather than
inspecting free-text error messages to decide which row above applies.

## Related documents

- `docs/25-failure-modes/FM-23-recovery-system-meta-failures.md` — failure modes for this component
- `docs/03-runtime/task-manager.md` — the state machine these mechanisms
  operate within
- `docs/06-tools/tool-interface.md` — the structured result schema
  supporting rollback and compensation
- `docs/13-devops/recovery.md` — the analogous storage-level recovery
  process
