# Runtime Task Coordinator

## Purpose

The Runtime Task Coordinator is the composition boundary that delegates task
lifecycle work to the authoritative Task Manager, Planner, Executor, and
Verifier. It does not replace any of those services and it does not execute a
tool directly.

## Execution contract

For a submitted task, the coordinator creates the authoritative `Created`
record, then drives the documented sequence:

```text
Created → Planning → Executing → Verifying → Completed
                                             ↘ Unverified
                                             ↘ Failed
```

Planning errors, permission denials, executor errors, and verifier errors are
recorded in `step_history` and settle the task in `Failed`. A successful
execution with no verification evidence settles in `Unverified`; it never
becomes `Completed`. A task becomes `Completed` only when every planned step
has a verifier verdict of `verified`.

The coordinator uses the existing Task Manager transition table, so illegal
transitions and retry-budget rules remain enforced by the Task Manager rather
than duplicated here.

## Event contract

Every successful task-state transition publishes the shared message envelope
on the `task.progress` topic. The payload contains the task identifier, goal,
state, retry count, and update timestamp. The task's `correlation_id` is copied
into every envelope so REST, desktop, WebSocket, and audit consumers can join
the same execution trace.

## Boundaries

The Executor remains behind the Permission Manager and resource-lock boundary.
The coordinator passes planned steps to the Executor and passes structured
execution results to the Verifier. The coordinator never reads Memory directly
and never reports an unverified result as successful.

## Recovery integration

The coordinator is designed to be hosted by the runtime composition root. The
composition root remains responsible for incremental persistence, crash
recovery, startup ordering, and resuming unfinished tasks as required by
`docs/02-architecture/lifecycle.md` and `docs/03-runtime/task-manager.md`.

## Related documents

- `docs/03-runtime/task-manager.md`
- `docs/03-runtime/planner.md`
- `docs/03-runtime/executor.md`
- `docs/03-runtime/verifier.md`
- `docs/03-runtime/permission-manager.md`
- `docs/02-architecture/lifecycle.md`
