# Startup Sequence

## Purpose

A standalone, step-by-step reference for NOVA's startup order, expressed
as a simple linear checklist. This is the "read this in ten seconds"
counterpart to `docs/02-architecture/lifecycle.md`'s full Mermaid diagram
and per-step failure-handling detail — start here, go there for the why
and the retry/timeout mechanics.

## Sequence

```
1.  Load Config
    ↓
2.  Load Secrets
    ↓
3.  Initialize Logger
    ↓
4.  Initialize Telemetry
    ↓
5.  Start Runtime Manager
    ↓
6.  Load Persisted State (memory, graph, settings)
    ↓
7.  Start Memory + Knowledge Graph
    ↓
8.  Start Observers (per granted permissions)
    ↓
9.  Plugin Discovery
    ↓
10. Start Enabled Plugins (sandboxed)
    ↓
11. Capability Registration (Tool Registry + Capability Registry)
    ↓
12. Start Planner, Executor, Verifier
    ↓
13. Start Workflow Engine
    ↓
14. Start API Gateway
    ↓
15. Resume Unfinished Tasks (from persisted Task Manager state)
    ↓
16. UI Layer Connects
    ↓
17. Ready
```

## Why this order (short version)

- Steps 1–4 come first because every later step needs to read its own
  config, resolve credentials, and be able to log/report if it fails —
  nothing after step 4 can safely run before it.
- Memory (7) comes before Observers (8) because Observer output needs
  somewhere durable to go the moment it starts emitting.
- Plugin discovery/start (9–10) and capability registration (11) happen
  before Planner starts (12), so the Planner never accepts work before
  its Tool Registry is fully populated — see `docs/02-architecture/lifecycle.md` for why this ordering specifically prevents a
  false-negative "capability not found" (`FM-04-011`).
- Task resumption (15) happens after Executor/Verifier are up (12), since
  resumed tasks may immediately need to execute or re-verify.

## Full detail

`docs/02-architecture/lifecycle.md` — per-step timeout, retry/backoff
policy, partial-startup/degraded-mode handling, and critical-vs-
non-critical service classification.

## Related documents

- `docs/02-architecture/lifecycle.md` — authoritative startup detail
- `01-component-dependency-graph.md` (this folder) — the dependency
  ordering this sequence is a topological sort of
- `03-shutdown-sequence.md` (this folder)

## Where This Breaks

This document is itself a build artifact an AI agent relies on. If it drifts from the real system, every agent that trusts it inherits the drift silently. The failures below are specific to *this document going stale or being wrong*, not to the subsystem it describes (see the cross-referenced FM files for that).

| ID | Failure | Trigger | Detection | Severity | Mitigation | Recovery |
|---|---|---|---|---|---|---|
| **FM-24-004** | Sequence doc drifts from actual boot code | A new step is inserted in code (e.g. a new mandatory init phase) without updating this file or `lifecycle.md`. | Startup integration test asserts the actual step-order log matches the documented sequence. | Medium | Add a startup-order assertion test to CI that fails if the runtime's actual step log diverges from the documented sequence. | Update this document and `lifecycle.md` together in the same PR that changes the actual startup code; never let code ship ahead of the doc update. |
| **FM-24-005** | Reader treats this simplified list as complete | An agent implements startup using only this file and misses the timeout/retry/degraded-mode handling that only lives in `lifecycle.md`. | Implementation lacks per-step timeout handling, caught in code review or by `FM-15-011` (startup failure) occurring in production with no graceful handling. | Low | This file explicitly states above that it is the short version and points to `lifecycle.md` for full detail — an agent must always follow that pointer before implementing, not stop at the summary. | Add the missing timeout/retry/degraded-mode handling per `lifecycle.md` before considering the startup implementation complete. |
| **FM-24-006** | See also `FM-15-001` through `FM-15-013` | The full startup failure catalog (init order, race conditions, partial init, restart loops) lives in the failure-modes folder, not duplicated here. | See `docs/25-failure-modes/FM-15-architecture-runtime-lifecycle-events.md`. | — | See FM-15. | See FM-15. |
