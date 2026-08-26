# Task Scheduler

`TaskScheduler` owns dispatch order and concurrency; it does not construct plans
or execute tool steps itself. It accepts a declared task ID and priority, then
calls the supplied execution dispatcher when a slot is available.

The scheduler requires an explicit positive `maxConcurrent` limit and a
positive `starvationThresholdMs` interval. Interactive tasks rank ahead of
default and background tasks. Equal effective priorities preserve FIFO order by
an internal enqueue sequence. Background and default work receive one effective
priority level for each complete starvation interval spent waiting, preventing
an unbounded interactive stream from starving older work.

A task is never queued twice while it is already queued or running. Dispatch
never starts more than `maxConcurrent` executions. A running task is not
preempted by a later interactive task; cancellation remains the Task Manager's
responsibility. `dispatch()` resolves only after the current queue has drained
and all started executions have settled, including executions that return a
failed `Result`.

The scheduler is intentionally independent of the distributed peer placement
boundary. A host may place a task through `DistributedTaskScheduler` first and
then dispatch it through this local scheduler on the selected peer.

The desktop composition root supplies an explicit conservative local policy of
`maxConcurrent: 1` and `starvationThresholdMs: 60000`. Desktop task submission
uses the authoritative `RuntimeTaskCoordinator` for durable creation, then
queues the resulting task at `interactive` priority and dispatches it through
this scheduler. The scheduler remains responsible only for ordering and
concurrency; it does not bypass Planner, Permission Manager, Executor, or
Verifier boundaries.

## Verification

Focused tests cover interactive-before-background ordering, FIFO tie-breaking,
and the configured concurrent execution limit. The runtime package exports the
scheduler for use by the application composition root and host-specific queue
integration.
