# FM-02: Planner, Task Queue, Workflow Engine & Scheduler

## Purpose

Covers everything that can go wrong from 'user asked for X' to 'a validated sequence of executable steps exists.' This includes plan generation, queueing, workflow branching, and time-based scheduling — the layer most prone to infinite loops and resource exhaustion.

## Scope & Related Documents

This file is part of `docs/25-failure-modes/`, the project-wide failure-mode catalog. It must be read alongside:

- `docs/03-runtime/planner.md` - `docs/03-runtime/task-manager.md` - `docs/03-runtime/scheduler.md` - `docs/03-runtime/job-scheduler.md` - `docs/17-workflow/workflow-engine.md` - `docs/03-runtime/planner-executor-contract.md`

`docs/03-runtime/scheduler.md` (task-dispatch ordering) and
`docs/03-runtime/job-scheduler.md` (recurring/cron-style jobs) are
distinct documents covering distinct mechanisms — see
`job-scheduler.md`'s own Purpose section for the exact distinction. Both
are in scope here; failure entries below specify which one they concern.

## Failure Catalog

Each failure is assigned a stable ID (`FM-02-0XX`) for cross-referencing from code comments, incident reports, and other failure-mode files.

| ID | Failure | Trigger Condition | Detection | Severity | Mitigation (prevent) | Recovery (respond) |
|---|---|---|---|---|---|---|
| **FM-02-001** | Create wrong plan | Ambiguous or underspecified user request; planner fills gaps with an incorrect assumption. | Verifier step (`docs/03-runtime/verifier.md`) flags plan output as not matching stated goal. | High | Require the planner to surface assumptions explicitly before execution when ambiguity score is high, using `docs/05-ai/ambiguity-resolution.md`. | Halt execution at first divergence; replan with the clarified constraint rather than continuing on a wrong branch. |
| **FM-02-002** | Missed steps | Planner omits a necessary prerequisite step (e.g. forgets to create a directory before writing into it). | Executor reports a precondition failure for a step whose dependency was never satisfied. | Medium | Validate the plan's dependency graph for missing preconditions before execution begins. | Insert the missing step dynamically and resume, rather than failing the whole task. |
| **FM-02-003** | Wrong dependency graph | Planner marks two steps as independent when one actually depends on the other's output. | Step B reads stale/placeholder data because step A had not completed when B ran. | High | Static dependency analysis on tool I/O schemas (`docs/06-tools/tool-interface.md`) before parallelizing. | Roll back step B, re-run in correct order once A's real output is available. |
| **FM-02-004** | Parallelize tasks incorrectly | Two steps that share a mutable resource are run concurrently without a lock. | Race condition detected via conflicting writes to the same resource in the same time window. | High | Resource-locking declared per tool (`affected_resources` field) enforced by the Task Manager scheduler. | Serialize the conflicting steps and re-run the later one from a clean state. |
| **FM-02-005** | Create impossible plans | Plan references a capability/tool that does not exist or is disabled. | Capability lookup fails at plan-validation time (`docs/06-tools/tool-registry.md`'s Lookup interface for tools; `docs/18-providers/capability-management.md` for AI-provider capabilities). | Medium | Validate every planned tool call against the live tool/capability registries before committing to the plan. | Replan using an available substitute capability, or surface to the user that the request cannot be fulfilled. |
| **FM-02-006** | Circular dependencies | Step A depends on step B's output and vice versa, due to a planning bug or bad user request. | Dependency graph cycle detection at plan-validation time. | High | Reject any plan containing a cycle at validation time — never attempt to execute it. | Replan from scratch with cycle-detection constraints tightened, or ask the user to disambiguate the request. |
| **FM-02-007** | Forget verification | Plan completes all action steps but skips the verification step, so failure is reported as success. | `docs/03-runtime/verifier.md` step absent from the completed step list. | High | Make verification a mandatory, non-skippable terminal step in the planner-executor contract. | Retroactively run verification before marking task complete; if it fails, transition to 'Unverified' state, not 'Success'. |
| **FM-02-008** | Never terminate / repeat tasks forever | Planner re-triggers itself due to a feedback loop (e.g. a monitoring task that spawns another monitoring task). | Task count for a given root goal exceeds a sane ceiling within a time window. | Critical | Hard step/time/recursion budget on every task per `docs/03-runtime/planner.md`; recursive task creation requires explicit termination condition. | Kill the task chain, log the loop signature, and require human review before re-enabling that plan pattern. |
| **FM-02-009** | Lost task | Task enqueued but queue write fails silently, or crash occurs between enqueue and persistence. | Task ID referenced by the user/UI has no matching queue entry. | High | Write-ahead persistence of task state before acknowledging receipt to the caller. | Reconstruct from the request log if available; otherwise surface an explicit 'task lost, please resubmit' rather than pretending it's still running. |
| **FM-02-010** | Duplicate task | Same task submitted twice due to retry-without-idempotency-key from an upstream caller (UI double-click, API retry). | Two tasks with identical goal+payload+timestamp window detected. | Medium | Idempotency keys on task submission, consistent with `docs/02-architecture/communication-model.md`. | Cancel the duplicate, keep the first; notify the user only one instance is running. |
| **FM-02-011** | Queue corruption | Persistent queue storage damaged by crash or concurrent write conflict. | Queue read returns malformed entries or fails deserialization. | Critical | Use a transactional/durable queue backend rather than a flat file with no atomicity guarantees. | Rebuild queue state from the task-manager's source-of-truth task table. |
| **FM-02-012** | Starvation | Low-priority tasks never execute because high-priority tasks keep preempting the scheduler. | Task age metric for low-priority queue grows unbounded. | Medium | Aging-based priority boost so no task waits indefinitely, per `docs/03-runtime/scheduler.md`'s Starvation Prevention section. | Force-schedule the oldest starved task ahead of a same-priority-tier new task. |
| **FM-02-013** | Priority inversion | A low-priority task holds a resource a high-priority task needs, and the low-priority task itself is preempted. | High-priority task blocked with no forward progress while holding no locks itself. | Medium | Priority inheritance: temporarily boost the low-priority task's priority while it holds a contended resource. | Detect and break the inversion by finishing or timing out the blocking task. |
| **FM-02-014** | Queue overflow | Ingestion rate of new tasks exceeds processing capacity for a sustained period. | Queue depth crosses a high-water-mark alert threshold. | High | Backpressure: reject or defer new low-priority task creation once queue depth crosses threshold. | Drain the queue at max safe throughput; surface a 'system busy' signal to new task submitters rather than silently queuing forever. |
| **FM-02-015** | Wrong execution order | Workflow engine executes nodes out of declared sequence due to a race in the event-driven trigger. | Output order does not match the declared workflow DAG. | Medium | Deterministic ordering guarantees in the workflow engine's node-trigger logic; no implicit concurrency without explicit fan-out declaration. | Re-run the workflow from the last correctly-ordered checkpoint. |
| **FM-02-016** | Infinite loop (workflow) | A workflow branch's exit condition is never satisfied due to a logic bug or a condition referencing stale state. | Node re-execution count for a single workflow run exceeds a sane ceiling. | Critical | Max-iteration ceiling on every loop construct in the workflow engine, enforced at the engine level, not left to the workflow author. | Terminate the workflow run, log the loop node, alert for manual review. |
| **FM-02-017** | Retry forever (workflow) | No max-retry ceiling on a failing node; engine retries indefinitely. | Retry count for a single node exceeds threshold without success. | High | Exponential backoff with a hard max-retry count and a dead-letter path for exhausted retries. | Route to dead-letter queue; surface failure explicitly instead of retrying silently forever. |
| **FM-02-018** | Wrong branch (workflow) | Conditional logic evaluates against stale or wrong context, sending execution down the wrong branch. | Branch taken does not match expected outcome given the actual input state. | Medium | Re-evaluate branch conditions against freshly fetched state immediately before the branch point, not cached state from earlier in the run. | Re-run from the branch point with corrected state. |
| **FM-02-019** | Skipped node (workflow) | Node marked complete due to a status-reporting bug without actually executing. | Node's expected side effect (file written, API called) absent despite 'completed' status. | High | Verify side effects, not just status flags, for nodes with observable external effects. | Re-execute the specific skipped node; do not re-run the entire workflow if isolated. |
| **FM-02-020** | Missed deadlines (scheduler) | Scheduler queue backlog or clock drift causes a scheduled job to fire late or not at all. | Actual fire time vs. scheduled fire time delta exceeds tolerance. | Medium | Dedicated high-priority lane for time-critical jobs, separate from best-effort task queue. | Fire immediately on detection of a missed deadline; log the miss for SLA tracking. |
| **FM-02-021** | Duplicate jobs (scheduler) | Scheduler restarts and re-registers a recurring job that was already registered, firing it twice. | Two active schedule entries with identical job signature. | Medium | Idempotent job registration keyed by job definition hash, checked on scheduler startup. | Deduplicate on next tick; cancel the redundant registration. |
| **FM-02-022** | Execute early / execute late / execute twice (scheduler) | Clock skew between scheduler node and system clock, or DST transition mishandled. | Fire time deviates from intended wall-clock time around a DST boundary or after an NTP resync. | Medium | Store and evaluate schedules in UTC with explicit timezone conversion only at the display/interpretation boundary, per `docs/00-overview/time-semantics.md`. | Re-fire or suppress the duplicate/missed occurrence based on idempotency key for that scheduled slot. |

## Compounding Failures

Notes on how failures in this file interact with failures elsewhere in this catalog — read these before assuming a bug is isolated to one subsystem.

- A planner that never terminates and a scheduler with no max-retry ceiling compound into a resource-exhaustion incident (see FM-16) even though each individually looks like a minor bug.
- Wrong dependency graphs in the planner surface as 'wrong execution order' in the workflow engine — treat these as the same root cause reported at two layers, not two bugs.

## Severity Legend

- **Critical** — data loss, security compromise, or user-visible harm; requires an incident-response runbook, not just a bug ticket.
- **High** — silent incorrectness, significant user-visible breakage, or a failure that blocks task completion with no graceful degradation.
- **Medium** — degraded quality/UX or a failure with a working but imperfect fallback.
- **Low** — cosmetic, rare, or fully recoverable with negligible user impact.
