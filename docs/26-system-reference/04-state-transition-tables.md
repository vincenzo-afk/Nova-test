# State Transition Tables

## Purpose

Explicit state-machine tables for every stateful entity in NOVA, so an
implementing agent can build a switch/match statement directly from this
document instead of inferring the state machine from paragraphs scattered
across other files. Every entry below is a **hard invariant**: a
transition not listed in a table is invalid and must be rejected (see
`FM-15-019`, Invalid state transition).

## Task Lifecycle

Derived from `docs/03-runtime/task-manager.md`, which is authoritative
per `docs/00-overview/normative-precedence.md` — if the two ever
disagree, `docs/03-runtime/task-manager.md` is correct and this table is
stale; fix this table to match it.

```
Created → Planning → Executing → Verifying → Completed
             ↓  ↑         ↓            ↓
       WaitingResources  Failed    Unverified
             ↓            ↓            ↓
          Paused ──→ WaitingUser   Retrying → Planning
             ↓            ↓
         (resumed)   Executing / Planning / Cancelled
```

| Current State | Event | Next State | Guard / Condition |
|---|---|---|---|
| `Created` | Task submitted | — | Initial state; not yet planned |
| `Created` | Planner dispatched | `Planning` | Per `docs/03-runtime/scheduler.md` dispatch ordering |
| `Planning` | Step requires a held resource lock | `WaitingResources` | Queued at Resource Manager (`docs/03-runtime/resource-manager.md`) |
| `Planning` | Plan validated | `Executing` | Plan passes dependency/cycle/capability validation (`docs/03-runtime/planner.md`) |
| `Planning` | Ambiguity-resolution requires user input | `WaitingUser` | `docs/05-ai/ambiguity-resolution.md`'s "ask user for clarification" branch; reason recorded as `clarification_requested` |
| `Planning` | No valid plan constructible | `Failed` | — |
| `WaitingResources` | Lock acquired | `Executing` | — |
| `Executing` | All steps done | `Verifying` | Never transitions directly to `Completed` |
| `Executing` | Unrecoverable step error | `Failed` | After exhausting retry policy |
| `Verifying` | Verification passes | `Completed` | Independent verifier, per `docs/03-runtime/verifier.md` |
| `Verifying` | Verification fails | `Unverified` | Never `Failed` directly — `Unverified` is distinct, see `docs/01-product/success-metrics.md` |
| `Unverified` | Retry policy allows | `Retrying` | Bounded retry count |
| `Failed` | Retry policy allows | `Retrying` | Bounded retry count |
| `Retrying` | Retry dispatched | `Planning` | — |
| `Created`, `Planning`, `WaitingResources`, `Executing` | Suspension (user or system) | `Paused` | State preserved for resumption |
| `Paused` | Resumed to planning | `Planning` | — |
| `Paused` | Resumed to executing | `Executing` | — |
| `Paused` | Pending Permission Manager confirmation | `WaitingUser` | Reason recorded as `permission_confirmation` |
| `WaitingUser` | Confirmed | `Executing` | `permission_confirmation` case only |
| `WaitingUser` | Denied | `Cancelled` | `permission_confirmation` case only |
| `WaitingUser` | Clarified | `Planning` | `clarification_requested` case only — always returns to (re-)planning, never directly to `Executing` |
| `Created`, `Planning`, `WaitingResources`, `Executing` | User/system cancels | `Cancelled` | — |
| `Completed`, `Unverified` (retries exhausted), `Failed` (retries exhausted), `Cancelled` | — | — | Terminal states; no outgoing transitions |

## Provider / Circuit Breaker

Canonical state names, numbers, and narrative detail: `docs/26-system-reference/19-ordering-concurrency-and-retry-rules.md`'s Circuit
breaker entry — if this table and that entry ever disagree, that entry
is correct and this table is stale; fix this table to match it.

| Current State | Event | Next State | Guard / Condition |
|---|---|---|---|
| `Closed` (healthy) | 5 consecutive failures to the same dependency | `Open` (tripped) | `health_status` becomes `down`, not `degraded` |
| `Open` | 60-second cooldown elapses | `HalfOpen` | Exactly one trial call admitted |
| `HalfOpen` | Trial request succeeds | `Closed` | Consecutive-failure counter resets to 0; `health_status` returns to `reachable`/`degraded` |
| `HalfOpen` | Trial request fails | `Open` | Cooldown resets to 60s; `health_status` remains `down` |

## Plugin Lifecycle

Canonical state names and narrative detail for each state:
`docs/16-extensibility/plugin-lifecycle.md`. This table is the formal
transition table derived from that document — if the two ever disagree,
`docs/16-extensibility/plugin-lifecycle.md` is correct and this table is
stale; fix this table to match it, per
`docs/00-implementation-governance/documentation-precedence.md`.

| Current State | Event | Next State | Guard / Condition |
|---|---|---|---|
| — (`[*]`) | Manifest validated (schema + signature check, `FM-12-016`) | `Installed` | This is the initial transition — there is no separate `Discovered` state in the canonical source; validation happens before the tracked lifecycle begins |
| `Installed` | User/policy enables | `Enabled` | Consent flow completed (`FM-12-007`); sandbox init succeeds |
| `Installed` | Sandbox init fails | `Failed` | — |
| `Enabled`, `Deprecated` | User/policy disables | `Disabled` | Process stopped, tools deregistered, package retained |
| `Disabled` | User/policy re-enables | `Enabled` | — |
| `Enabled` | New version applied | `Updating` | — |
| `Updating` | Update succeeds | `Enabled` | — |
| `Updating` | Update fails | `Failed` | — |
| `Failed` | Manual review resolves | `Disabled` | Never auto-transitions out of `Failed` |
| `Enabled` | Marked deprecated by publisher/policy | `Deprecated` | Still functional; see `docs/16-extensibility/plugin-lifecycle.md` |
| `Deprecated` | Un-deprecated | `Enabled` | — |
| `Disabled`, `Deprecated` | Uninstall requested | `Uninstalled` | Cleanup verified (`FM-19-008`) |
| `Uninstalled` | — | — | Terminal state |

## Workflow Node

> **Corrected fabricated state machine.** This table previously listed a
> standalone `Pending`/`Ready`/`Running`/`Succeeded`/`Retrying`/`Failed`/
> `DeadLettered` chain for "Workflow Node" that appeared nowhere else in
> the repository — not in `docs/17-workflow/workflow-engine.md` (the
> document this table's own Related-documents section cites as "full
> workflow node detail"), and not listed as a distinct object in
> `docs/26-system-reference/16-lifecycle-and-state-machine-index.md`,
> which indexes every object with a lifecycle. `workflow-engine.md`'s own
> Workflow node types and Workflow state sections are explicit that a
> **Task node wraps exactly one Planner-Executor step and is not a
> different execution primitive** — a workflow node's state *is* the
> Task state machine (`docs/03-runtime/task-manager.md`), not a
> parallel enum. There is no separate Workflow Node table to give; the
> row below points at the real one instead of restating an invented copy.

| Current State | Event | Next State | Guard / Condition |
|---|---|---|---|
| *(see Task Lifecycle table above)* | A workflow's Task nodes transition exactly per the Task state machine | *(see Task Lifecycle table above)* | `docs/17-workflow/workflow-engine.md`'s Workflow state section: a workflow's state is the union of its constituent nodes' Task states plus graph-level position (which nodes completed, which branches are in flight) |
| `Failed`/`Unverified` (retries exhausted, per Task Lifecycle) | Retry budget exhausted for a node on the critical path | Node routed to dead-letter queue | Workflow-level behavior only, not a node terminal *state* — per `FM-02-017`; the node's own state remains `Failed`/`Unverified` as terminal, and the workflow surfaces the failure explicitly rather than retrying silently forever |
| Any non-terminal node state | Human-approval node denies, or a Rollback node is reached | Rollback invoked for every completed node on the path | `docs/17-workflow/workflow-engine.md`'s Rollback node, `docs/03-runtime/failure-recovery.md`'s compensation mechanisms |

## Session

| Current State | Event | Next State | Guard / Condition |
|---|---|---|---|
| `Active` | Idle timeout | `Idle` | Conversation timeout only — does not affect any in-progress Task's state (`FM-06-019`) |
| `Idle` | New message | `Active` | — |
| `Idle` | Extended idle timeout | `Expired` | — |
| `Expired` | New message | `Active` (new session, prior linked) | Per `FM-06-020` reconnect-vs-new-session handling |

## Related documents

- `docs/03-runtime/task-manager.md`, `docs/03-runtime/executor.md`,
  `docs/03-runtime/verifier.md` — full prose detail behind the Task/Agent table
- `docs/03-runtime/service-lifecycle.md` — per-service lifecycle state
  machine (Starting/Running/Degraded/Failed/Stopping/Stopped)
- `docs/16-extensibility/plugin-lifecycle.md` — full plugin lifecycle detail
- `docs/17-workflow/workflow-engine.md` — full workflow node detail

## Where This Breaks

This document is itself a build artifact an AI agent relies on. If it drifts from the real system, every agent that trusts it inherits the drift silently. The failures below are specific to *this document going stale or being wrong*, not to the subsystem it describes (see the cross-referenced FM files for that).

| ID | Failure | Trigger | Detection | Severity | Mitigation | Recovery |
|---|---|---|---|---|---|---|
| **FM-24-010** | Table omits a state/transition that exists in code | Implementation adds a new state (e.g. a new `Paused` task state) without updating this table. | State-machine conformance test enumerates all states/transitions reachable in code and diffs against this table. | High | Generate this table from a single machine-readable state-machine definition where feasible, rather than hand-maintaining prose and code separately. | Update the table; add the missing transition to the invalid-transition-rejection tests referenced by `FM-15-019`. |
| **FM-24-011** | Agent implements an undocumented 'convenience' transition | Implementer adds a shortcut transition (e.g. `Executing` directly to `Completed`, skipping `Verifying`) believing it's a harmless optimization. | Code review, or `FM-05-016`'s false-success-reporting detection catching a task marked complete with no independent verification. | Critical | State explicitly (as done above) that `Verifying` is a mandatory hop, never skippable, so 'convenience' shortcuts are recognizable as invariant violations, not implementation choices. | Revert the shortcut transition; treat any task that went through it as `Unverified` retroactively. |
| **FM-24-012** | Two tables in this document disagree with each other on a shared boundary | e.g. Session table's 'Active' interacting with Task table's states isn't cross-checked for consistency. | Manual review during the next revision of either table catches an inconsistency at the boundary. | Low | Cross-reference boundary conditions explicitly (as done in the Session table's guard column) rather than describing each state machine in total isolation. | Reconcile the two tables' boundary description; clarify which is authoritative for the overlapping behavior. |
