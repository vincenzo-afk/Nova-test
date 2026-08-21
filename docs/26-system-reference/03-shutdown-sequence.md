# Shutdown Sequence

## Purpose

The explicit, standalone shutdown checklist — the reverse-order
counterpart to `02-startup-sequence.md`, called out on its own because
shutdown correctness (nothing lost, nothing left in an inconsistent
state) is easy to under-specify relative to startup.

## Sequence

```
1. Stop Accepting New Requests (API Gateway)
   ↓
2. Give In-Flight Tasks a Bounded Window to Reach a Safe Pause Point
   ↓
3. Cancel/Pause Workflows (persist resumable state, not force-complete)
   ↓
4. Stop Executor and Observers
   ↓
5. Unload Plugins (in reverse load order, sandboxed teardown)
   ↓
6. Persist Cache (flush any write-behind cache entries)
   ↓
7. Save Memory + Knowledge Graph (flush pending writes, checkpoint)
   ↓
8. Flush Logs and Telemetry
   ↓
9. Runtime Manager Exits
```

## What "safe pause point" means (not "complete")

Step 2 does not wait for tasks to finish — it waits for them to reach a
state from which `docs/02-architecture/lifecycle.md`'s crash-recovery
procedure could safely resume them, per `docs/03-runtime/task-manager.md`.
A task mid-write to an external system is given time to reach a
checkpoint boundary, not forced to complete the whole task before
shutdown proceeds — otherwise ordinary shutdown could hang indefinitely
on a slow task.

## Why plugins unload before memory/cache flush

Plugins may still be writing through Memory or Cache APIs during their
own teardown (a plugin's `on_disable` hook persisting its own state via
NOVA's storage layer); unloading plugins first and flushing memory/cache
last ensures no plugin-originated write is lost by flushing too early.

## Related documents

- `docs/02-architecture/lifecycle.md` — full unclean-shutdown/crash-
  recovery detail (this file covers only the clean/ordinary shutdown path)
- `docs/03-runtime/task-manager.md` — what "safe pause point" means per
  task type
- `docs/16-extensibility/plugin-lifecycle.md` — plugin teardown hook detail
- `02-startup-sequence.md` (this folder)

## Where This Breaks

This document is itself a build artifact an AI agent relies on. If it drifts from the real system, every agent that trusts it inherits the drift silently. The failures below are specific to *this document going stale or being wrong*, not to the subsystem it describes (see the cross-referenced FM files for that).

| ID | Failure | Trigger | Detection | Severity | Mitigation | Recovery |
|---|---|---|---|---|---|---|
| **FM-24-007** | Shutdown doc omits a step present in code | Same drift risk as startup — a new subsystem is added with its own teardown need, but this checklist isn't updated. | Same CI order-assertion pattern as `FM-24-004`, applied to the shutdown path. | Medium | Same mitigation as `FM-24-004`. | Same recovery as `FM-24-004`. |
| **FM-24-008** | See also `FM-15-010` through `FM-15-012` | Graceful-shutdown failures, shutdown interruption, and hot-reload inconsistency are cataloged in the failure-modes folder, not duplicated here. | See `docs/25-failure-modes/FM-15-architecture-runtime-lifecycle-events.md`. | — | See FM-15. | See FM-15. |
| **FM-24-009** | Reader assumes shutdown is purely the reverse of startup | Steps are similar but not identical (e.g. plugin unload ordering relative to memory flush, described above, has a reason specific to shutdown). | Implementation bug where a developer mirrors startup order exactly rather than reading this file's specific ordering. | Low | State the non-obvious ordering reasons explicitly in this document (as done above) rather than leaving them implicit. | Fix the specific step-ordering bug; add a regression test asserting the documented order is what actually executes. |
