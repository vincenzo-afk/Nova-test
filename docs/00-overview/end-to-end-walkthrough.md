# End-to-End Walkthrough

## Purpose

Traces one complete, realistic request through every major component it
touches, in sequence, with the specific document governing each step
named inline. This is the single fastest way for an implementing
engineer or AI agent to see how the pieces specified across 200+
documents actually compose into one working flow, before diving into any
individual component's detail.

## Scope

One worked example. It does not replace any component's own
specification — every step below names the authoritative document for
that step's detailed behavior.

## Example request

> "Clean up my Downloads folder — delete anything older than 90 days
> except PDFs, and move installers to an Installers subfolder."

This example is chosen because it exercises planning, deterministic and
LLM-assisted reasoning, multiple risk tiers, resource locking, and
verification — more of the system than a purely read-only query would.

## Trace

**1. Request enters the system.**
The user types this in Chat (`docs/09-ui/chat.md`). The UI Layer sends it
to the API Gateway over the Internal API (`docs/08-api/internal-api.md`).

**2. Task creation.**
The API Gateway creates a task via Task Manager
(`docs/03-runtime/task-manager.md`), which assigns a `task_id` and `correlation_id` (`docs/02-architecture/communication-model.md`) and sets
state to `Created`, then `Planning`.

**3. Context assembly.**
The Planner (`docs/03-runtime/planner.md`) requests context from the
Context Builder (`docs/05-ai/context-builder.md`), which queries the
Retrieval Fusion Engine (`docs/04-memory/retrieval-engine.md`) for
"Downloads folder" — resolving it via Entity Resolution
(`docs/04-memory/entity-resolution.md`) against the Knowledge Graph
(`docs/04-memory/ontology.md`) to the specific File/Project entities
involved, and checks Episodic Replay (`docs/05-ai/episodic-replay.md`)
for a similar prior successful cleanup task.

**4. Decomposition.**
Per the formal planning algorithm (`docs/03-runtime/planner.md`), the
goal decomposes into per-file sub-decisions: for each file in Downloads,
determine its age and type, then classify it as delete/move/leave.

**5. Deterministic-first check, per sub-step.**
"Is this file older than 90 days" and "is this a PDF" are both
deterministic filesystem/metadata checks
(`docs/05-ai/deterministic-first.md`) — no LLM call. "Is this file an
installer" may require the LLM if filename/extension alone is
insufficient, routed through `docs/05-ai/ambiguity-resolution.md`'s
"requires inference" branch.

**6. Model routing (only for the installer-classification sub-step).**
The Model Router (`docs/05-ai/model-router.md`) selects a provider per
the routing matrix (`docs/05-ai/model-routing-matrix.md`), and the
Reasoning Engine (`docs/05-ai/reasoning-engine.md`) constructs the call
using Model Context Assembly's exact ordering
(`docs/05-ai/model-context-assembly.md`) and the Prompt System's
content/instruction separation (`docs/05-ai/prompt-system.md`).

**7. Capability and tool resolution.**
Each sub-decision resolves to a capability (`docs/05-ai/capability-registry.md`, e.g., "delete file," "move file") and then to a
specific registered tool via Tool Selection
(`docs/05-ai/tool-selection.md`) and the Tool Registry
(`docs/06-tools/tool-registry.md`).

**8. Risk-tier classification and the Planner-Executor contract.**
The Planner emits a step per the strict schema in
`docs/03-runtime/planner-executor-contract.md`. A delete is
destructive/irreversible; a move is reversible-write
(`docs/10-security/permissions.md`).

**9. Permission gating.**
Every step passes through the Permission Manager
(`docs/03-runtime/permission-manager.md`). The delete steps require
explicit confirmation, batched into one summary confirmation naming every
file to be deleted (per `docs/10-security/permissions.md`), not one
prompt per file. The move steps proceed without confirmation (reversible,
lower tier).

**10. Resource locking.**
Before touching the Downloads folder, the Executor acquires a lock via
the Resource Manager (`docs/03-runtime/resource-manager.md`), preventing
a concurrent task from modifying the same folder mid-operation.

**11. Execution.**
The Executor (`docs/03-runtime/executor.md`) invokes each tool at the
Native Runtime tier (`docs/06-tools/native-runtime.md`) — file
delete/move are direct filesystem operations, the highest-priority,
lowest-risk-mechanism tier in the execution-priority chain
(`docs/06-tools/execution-priority.md`).

**12. Verification.**
The Verifier (`docs/03-runtime/verifier.md`) confirms each delete via
absence-check and each move via the file's new path and hash — ground-
truth signals, per `docs/06-tools/tool-interface.md`'s structured result.

**13. Observation feedback loop.**
The Filesystem Observer (`docs/07-observers/filesystem.md`) also detects
these changes independently; because they carry this task's
`correlation_id`, they are correctly attributed as NOVA-caused
(`docs/03-runtime/observer.md`), not misread as new user activity.

**14. Task completion and memory write.**
Task Manager transitions to `Completed`
(`docs/03-runtime/task-manager.md`). The outcome is written to Recent
Memory (`docs/04-memory/memory-lifecycle.md`), with confidence and
source metadata (`docs/04-memory/memory-confidence.md`), and eventually
summarized into Long-term Memory.

**15. Audit and explanation.**
The full trace above is reconstructable from the audit trail
(`docs/10-security/audit.md`) via `correlation_id`, and available as a
structured explanation on request (`docs/05-ai/explainability.md`).

**16. UI update.**
Task Manager's status update flows back through the API Gateway to Chat
and Task Monitor (`docs/09-ui/task-monitor.md`), showing each step's
outcome, not a single generic "done."

## What this walkthrough deliberately does not show

Failure and retry paths (`docs/03-runtime/failure-recovery.md`), plugin-
sourced tools (`docs/16-extensibility/`), and GUI/vision-tier execution
(`docs/06-tools/vision.md`) — this example stays on the "everything went
right, native-tier execution" path intentionally, since it is meant as an
orientation trace, not a complete coverage test. See
`docs/01-product/use-cases.md` for the full set of canonical scenarios,
several of which exercise these other paths.

## Related documents

- Every document named inline above
- `docs/01-product/use-cases.md` — the source use case this walkthrough
  traces
- `docs/02-architecture/execution-pipeline.md` — the general-form
  sequence diagram this specific example instantiates
