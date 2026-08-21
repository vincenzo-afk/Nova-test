# Executor

## Purpose

Carries out a single selected tool call and returns a structured,
machine-checkable result. The Executor is deliberately "dumb" — it does
not decide what to run or whether it should be allowed to run; it runs
exactly what the Planner selected, after the Permission Manager has
cleared it.

## Scope

Invocation and result-structuring only. Tool selection belongs to the
Planner and Tool Registry; risk-tier gating belongs to the Permission
Manager; outcome confirmation belongs to the Verifier.

## Execution contract

Every tool invocation the Executor performs follows the same contract,
regardless of which execution tier the tool belongs to
(`docs/06-tools/execution-priority.md`):

1. Receive a fully-resolved tool call specification from the Planner
   (tool identifier, parameters, declared risk tier).
2. Confirm with the Permission Manager that this specific call is cleared
   to run (immediately, after confirmation, or blocked) —
   see `permission-manager.md`.
3. Acquire any required resource locks from the Resource Manager
   (`resource-manager.md`) before touching a shared resource.
4. Invoke the tool through its registered interface
   (`docs/06-tools/tool-interface.md`).
5. Capture a structured result: exit code / API response / accessibility
   state / file hash, per the tool's declared result type — never just a
   boolean "done".
6. Release any locks held.
7. Return the structured result to the Planner, which forwards it to the
   Verifier.

## Structured result requirement

Per the project's foundational review, a tool that can only report "done"
with no structured, independently-checkable evidence is not eligible for
unattended (non-confirmed) execution — see
`docs/06-tools/tool-interface.md` for the exact schema every tool
integration must implement to be registered at all.

## Failure handling during execution

If a tool call fails partway (e.g., a multi-file operation fails on file
3 of 5), the Executor reports exactly which sub-steps completed and which
did not, rather than a single aggregate failure — this granularity is
what allows the Verifier and Planner to determine whether partial
completion is safe to leave as-is, needs rollback, or can be resumed from
the failure point.

## Cancellation

On a cancellation signal from Task Manager, the Executor stops issuing new
sub-steps of the current tool call as soon as it is safe to do so, but
does not forcibly interrupt an already-issued OS-level operation that
cannot be safely interrupted (e.g., a file write already in progress) —
it waits for that specific operation to reach a safe boundary first, then
halts.

## Related documents

- `docs/25-failure-modes/FM-03-agent-orchestration-and-collaboration.md` — failure modes for this component
- `docs/06-tools/tool-interface.md` — the structured result schema
  referenced above
- `permission-manager.md`, `resource-manager.md` — the gates every
  invocation passes through
- `verifier.md` — the consumer of the Executor's structured result
