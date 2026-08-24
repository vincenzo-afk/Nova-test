# Job Scheduler

## Purpose

Specifies recurring, cron-style, and delayed background jobs — a
distinct concept from `docs/03-runtime/scheduler.md`'s task-dispatch
ordering, which governs _when a queued, user-triggered task starts_. This
document covers jobs that run on their own schedule, independent of any
user request: garbage collection, defragmentation, memory summarization
passes, benchmark runs, and similar maintenance work already described
elsewhere but never previously given one dedicated scheduling
specification.

## Scope

Recurring/scheduled job definition, dependency, cancellation, and
persistence. User-triggered task dispatch ordering remains
`docs/03-runtime/scheduler.md`.

## Job types

- **Recurring (interval-based)** — e.g., memory garbage collection
  (`docs/04-memory/memory-garbage-collection.md`), running every N hours.
- **Cron-style (calendar-based)** — e.g., a nightly backup snapshot
  (`docs/13-devops/backup.md`), running at a specific time of day.
- **Delayed (one-shot, future-scheduled)** — e.g., a plugin update
  (`docs/16-extensibility/plugin-lifecycle.md`) scheduled for the next
  idle period rather than run immediately.

## Job definition schema

```json
{
  "job_id": "string",
  "type": "recurring | cron | delayed",
  "schedule": "interval (e.g. '6h') | cron expression | ISO 8601 datetime",
  "dependencies": ["array of job_id values that must complete first, if run in the same window"],
  "priority": "low | normal",
  "concurrency_group": "string, jobs in the same group never run simultaneously",
  "idempotent": "boolean, per docs/03-runtime/failure-recovery.md's idempotency requirement"
}
```

## Scheduling and concurrency

All background jobs run at **low** priority by default, per
`docs/11-performance/resource-usage.md`'s background-job budgeting —
they yield to foreground user activity and to the Scheduler's
interactive-task priority (`docs/03-runtime/scheduler.md`). Jobs sharing
a `concurrency_group` (e.g., garbage collection and defragmentation,
`docs/04-memory/memory-garbage-collection.md`, both touching the same
storage) are serialized against each other even if their individual
schedules would otherwise overlap.

## Cancellation

A running job can be cancelled the same way a task can
(`docs/03-runtime/task-manager.md`'s cancellation semantics) — safely
paused at a checkpoint boundary where the job supports one
(`docs/03-runtime/failure-recovery.md`), or, for jobs with no meaningful
partial state (a single benchmark run), simply aborted and rescheduled
for its next normal occurrence.

## Persistence and recovery after reboot

Every job's schedule and last-run timestamp are persisted (not held only
in memory), so that a reboot does not lose track of when a recurring job
last ran — on restart, the Job Scheduler checks each job's last-run
timestamp against its schedule and immediately runs any job that missed
its window during downtime, rather than waiting a full interval from
restart time, unless the job is explicitly configured as "skip missed
occurrences" (appropriate for something like a benchmark run, where a
missed occurrence is not worth catching up on).

The runtime `JobScheduler` implements this contract over an injected local
`JobStore`; `FileJobStore` provides atomic JSON persistence and
`InMemoryJobStore` supports isolated tests. Newly registered recurring jobs
run at the first due dispatch and then advance by their interval. Cron jobs
use UTC five-field expressions, and delayed jobs complete after their
one-shot timestamp. Due dependencies execute before their dependents, while
jobs sharing a `concurrency_group` are serialized. A running job receives an
`AbortSignal` for safe cancellation at its own checkpoint boundary. Missed
runs are caught up by default, and jobs opting out advance to their next
future occurrence. Scheduler diagnostics contain only bounded job IDs,
status, priority, group, counts, and timestamps; job payloads are not part
of the logging contract.

## Related documents

- `docs/25-failure-modes/FM-02-planner-task-queue-scheduler.md` — failure modes for this component
- `docs/03-runtime/scheduler.md` — the distinct, user-triggered task
  dispatch concept
- `docs/04-memory/memory-garbage-collection.md`, `docs/13-devops/backup.md` — example consumers of this scheduling model
- `docs/11-performance/resource-usage.md` — the background-job resource
  budget these jobs operate within
