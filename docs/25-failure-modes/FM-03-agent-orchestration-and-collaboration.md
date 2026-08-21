# FM-03: Agent Orchestration & Multi-Agent Collaboration

## Purpose

When NOVA splits work across multiple specialized agents (Planner → Coder → Reviewer → Tester → Verifier, or parallel sub-agents), a new class of coordination failures becomes possible that don't exist in a single-agent pipeline.

## Scope & Related Documents

This file is part of `docs/25-failure-modes/`, the project-wide failure-mode catalog. It must be read alongside:

- `docs/24-collaboration/multi-agent-collaboration.md` - `docs/03-runtime/executor.md` - `docs/03-runtime/verifier.md`

## Failure Catalog

Each failure is assigned a stable ID (`FM-03-0XX`) for cross-referencing from code comments, incident reports, and other failure-mode files.

| ID | Failure | Trigger Condition | Detection | Severity | Mitigation (prevent) | Recovery (respond) |
|---|---|---|---|---|---|---|
| **FM-03-001** | Deadlock | Two agents each wait on a resource/output the other holds. | Both agents report 'waiting' status with no progress for longer than the deadlock-detection window. | Critical | Timeout-bound waits on every inter-agent dependency; no unbounded wait is permitted. | Break the deadlock by forcibly failing the lower-priority agent's wait and replanning its step. |
| **FM-03-002** | Infinite loop (agents) | Reviewer rejects, Coder revises, Reviewer rejects again, with no convergence criterion. | Revision-round counter for a single sub-task exceeds a ceiling without approval. | High | Max revision rounds with escalation to a human or a different strategy after the ceiling. | Escalate to `docs/24-collaboration`'s human-approval path rather than looping further. |
| **FM-03-003** | Wait forever | Downstream agent blocks on an upstream agent that already failed silently, with no failure propagation. | Heartbeat/liveness check on the upstream agent shows it terminated without emitting a completion event. | High | Every agent step must emit either success, failure, or a heartbeat within a bounded interval; absence triggers timeout handling. | Treat missing heartbeat as failure; unblock downstream agents with an explicit failure signal. |
| **FM-03-004** | Duplicate work | Two agents are independently assigned overlapping sub-tasks due to a planner decomposition bug. | Two completed results for logically the same sub-task ID/goal signature. | Medium | Sub-task assignment must be exclusive and tracked centrally by the Task Manager, not inferred by each agent independently. | Keep the higher-quality/first-completed result; discard the duplicate and log the decomposition bug. |
| **FM-03-005** | Skip work | A sub-task falls through the cracks of the decomposition (e.g. an edge case the planner didn't enumerate). | Verifier finds an aspect of the original goal with no corresponding completed sub-task. | Medium | Explicit coverage check: every acceptance criterion in the original goal must map to at least one sub-task. | Insert the missing sub-task and dispatch it before marking the parent task complete. |
| **FM-03-006** | Contradict each other | Coder implements X, Reviewer's mental model assumes not-X, and neither is told about the other's assumption. | Reviewer's feedback references a design decision the Coder was never given. | Medium | Shared, explicit spec object passed to every agent in the pipeline rather than each agent inferring context independently. | Reconcile against the shared spec; whichever agent diverged from spec is corrected, not the one that followed it. |
| **FM-03-007** | Produce inconsistent outputs | Same sub-task run twice (e.g. after a retry) produces materially different results due to non-determinism. | Diff between two runs of the same sub-task with identical input exceeds an expected-variance threshold. | Medium | Pin model temperature/seed for deterministic sub-tasks (code generation, structured extraction) per `docs/05-ai/reasoning-engine.md`'s Sampling parameters section. | Prefer the verified/tested output; discard the other; investigate the non-determinism source. |
| **FM-03-008** | Race conditions (agents) | Two agents write to the same shared state (e.g. working memory) concurrently without synchronization. | Last-write-wins overwrite detected where both writes were semantically meaningful. | High | Optimistic concurrency control with version numbers on shared state; reject writes based on stale version. | Merge or replay the losing write against the current state rather than silently dropping it. |
| **FM-03-009** | Lose context (agents) | Handoff between agents drops relevant working memory because the handoff payload schema doesn't carry it. | Downstream agent asks a question already answered upstream in the same task. | Medium | Standardized handoff payload that includes full working-memory context, not just the immediate output. | Re-fetch context from the Task Manager's checkpoint rather than re-deriving it from scratch. |
| **FM-03-010** | Planner forgets tests | Decomposition includes implementation steps but omits a testing sub-task. | No test-related sub-task exists in the plan for a code-generation goal. | Medium | Testing sub-task is mandatory by policy for any code-generation plan, enforced by the Policy Engine (FM-18). | Insert the missing test sub-task before allowing the pipeline to proceed to Reviewer. |
| **FM-03-011** | Coder ignores spec | Generated code satisfies the literal prompt but violates an explicit constraint in the spec (e.g. no external dependencies). | Static spec-conformance check flags a violation post-generation. | Medium | Automated spec-conformance linting before code reaches the Reviewer agent. | Regenerate with the violated constraint restated explicitly and highlighted. |
| **FM-03-012** | Reviewer approves broken code | Reviewer agent's checks are shallow (style-only) and miss a functional bug. | Bug surfaces at Tester or Verifier stage despite prior 'approved' status from Reviewer. | High | Reviewer checklist must include functional correctness spot-checks, not just style; log false-approval rate to recalibrate the Reviewer prompt/model. | Treat Verifier as the actual gate of record; a Reviewer approval is advisory, never sufficient alone to mark complete. |
| **FM-03-013** | Tester misses bug | Test coverage gap; edge case not exercised. | Bug reported by end user/production despite passing test suite (post-hoc detection only). | High | Coverage-driven test generation per `docs/12-testing/testing-strategy.md`; flag low-coverage areas before sign-off. | Add a regression test reproducing the missed bug; do not close the loop until the new test passes. |
| **FM-03-014** | Verifier checks wrong thing | Verifier's acceptance criteria drifted from the actual user goal during a multi-step task. | Verifier reports 'passed' but the user says the delivered result doesn't match what they asked for. | High | Verifier's acceptance criteria must be derived directly from the original goal statement, re-validated at verification time, not cached from planning time. | Re-run verification against the original goal text; if it now fails, task reopens as Unverified. |
| **FM-03-015** | Agents disagree | Two agents produce conflicting recommendations with no arbitration rule. | Divergent outputs for the same decision point with no tie-breaker configured. | Medium | Explicit arbitration policy: designated tie-breaking agent, confidence-weighted vote, or escalate to human per `docs/23-autonomy` autonomy tier. | Escalate to human approval (FM-18) rather than picking arbitrarily when confidence is close. |
| **FM-03-016** | One agent overwrites another's work | Concurrent file/state edits by two agents without a merge strategy. | Diff shows agent B's output has no trace of agent A's prior edits that should have been preserved. | High | File/state-level locking or CRDT-style merge for any resource multiple agents can touch. | Restore from the last checkpoint before the overwrite and replay both agents' work in the correct order. |

## Compounding Failures

Notes on how failures in this file interact with failures elsewhere in this catalog — read these before assuming a bug is isolated to one subsystem.

- Agent disagreement combined with no arbitration policy (see FM-18 Policy Engine) leaves the system stuck with no forward-progress path — always pair orchestration failure modes with an explicit tie-breaking rule.
- One agent silently overwriting another's work is functionally identical to a lost update in a distributed system (see FM-10) — apply the same optimistic-concurrency-control pattern.

## Severity Legend

- **Critical** — data loss, security compromise, or user-visible harm; requires an incident-response runbook, not just a bug ticket.
- **High** — silent incorrectness, significant user-visible breakage, or a failure that blocks task completion with no graceful degradation.
- **Medium** — degraded quality/UX or a failure with a working but imperfect fallback.
- **Low** — cosmetic, rare, or fully recoverable with negligible user impact.
