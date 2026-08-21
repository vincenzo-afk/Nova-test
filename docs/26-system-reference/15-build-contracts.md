# Build Contracts & Component Boundaries

## Purpose

The single place an implementer checks, before writing a line of code
for a major subsystem, to see its full contract in one view: inputs,
guaranteed outputs, invariants, forbidden actions, allowed actions,
dependencies, dependents, and ownership boundaries. Every fact stated
here already exists somewhere in the subsystem's own document — this
file does not introduce new behavior, it removes the need to reconstruct
the contract by reading five files before starting. Per Sections 1 and 2
of the master documentation outline, this is the highest-priority gap
this file closes: without a consolidated contract, an AI implementer
tends to invent missing pieces rather than notice they're missing.

## Scope

The five major runtime subsystems whose boundaries are most load-bearing
and most often blurred in practice: Planner, Executor, Memory Manager,
Verifier, Plugin Host. Every other component follows the same format
(`docs/14-development/module-contract-standard.md`) in its own document;
this file is not a replacement for those, only a fast-reference ledger
for the five where boundary confusion is costliest.

## How to read each entry

**Input / Output** — the contractual data in and out.
**Owns** — state or responsibility exclusively this component's.
**Does NOT own** — state it must never write to directly.
**Can** — actions explicitly permitted.
**Cannot** — actions structurally impossible or gated elsewhere.
**Must never** — the negative contract (Section 25 of the first
outline) — violations that would blur the layer even if technically
possible.
**Dependencies / Dependents** — what it calls, what calls it.
**Communicates only through** — the sanctioned interface(s).

## Planner

- **Input:** Goal, Context (`docs/05-ai/context-builder.md`), Workspace
  reference.
- **Output:** Execution Plan (`docs/03-runtime/planner-executor-contract.md`).
- **Owns:** Plan construction, step sequencing, capability resolution.
- **Does NOT own:** Tool execution, file writes, permission grants.
- **Can:** Read workspace state, read memory, analyze, decompose goals,
  request clarification.
- **Cannot:** Execute tools, mutate the workspace, write files, grant
  itself permissions.
- **Must never:** Skip validation of a plan before handoff; assume a
  step will succeed without the Verifier confirming it; execute a tool
  "just this once" to unblock planning.
- **Dependencies:** Memory (read-only), World Model
  (`docs/03-runtime/world-model.md`), Capability Registry.
- **Dependents:** Executor (consumes the Plan).
- **Communicates only through:** the Planner→Executor contract
  (`docs/03-runtime/planner-executor-contract.md`).

## Executor

- **Input:** A validated Execution Plan step
  (`docs/03-runtime/planner-executor-contract.md`).
- **Output:** Structured step result (`docs/06-tools/tool-interface.md`).
- **Owns:** Tool invocation, execution-tier routing, resource locks
  during execution (`docs/03-runtime/resource-manager.md`).
- **Does NOT own:** Plan construction, permission policy, verification
  logic.
- **Can:** Invoke tools within its granted risk tier, acquire declared
  locks, emit progress events.
- **Cannot:** Alter the Plan it was given, bypass the Permission Manager
  (`docs/03-runtime/permission-manager.md`), skip the Verifier stage.
- **Must never:** Execute a step whose risk tier exceeds the task's
  current authorization; retry a non-idempotent destructive action
  without explicit re-confirmation.
- **Dependencies:** Permission Manager, Tool Registry, Resource Manager.
- **Dependents:** Verifier (consumes the result).
- **Communicates only through:** the Executor→Verifier contract
  (`docs/03-runtime/planner-executor-contract.md`).

## Memory Manager

- **Input:** Reflection output, explicit user-stated facts, task
  outcomes.
- **Output:** Knowledge graph mutations, retrieval results.
- **Owns:** The knowledge graph and its indices
  (`docs/04-memory/knowledge-graph.md`).
- **Does NOT own:** Task state, plugin state, UI state.
- **Can:** Write new nodes/edges, reinforce or supersede existing ones,
  serve retrieval queries.
- **Cannot:** Delete a node outright (tombstone only,
  `docs/04-memory/memory-garbage-collection.md`), be written to directly
  by a plugin.
- **Must never:** Let the graph become cyclic
  (`system-invariants.md`); silently drop a memory entry without a
  tombstone and event.
- **Dependencies:** Reflection pipeline, Embeddings service.
- **Dependents:** Planner, Reviewer/Verifier. (Executor does not read
  Memory directly — it executes pre-resolved plan steps handed to it by
  the Planner, which is the component that consults Memory; see
  `docs/03-runtime/executor.md`'s Purpose section on why it is
  deliberately "dumb.")
- **Communicates only through:** `docs/04-memory/memory-storage.md`'s
  public read/write API.

## Verifier

- **Input:** Executor's step result, the original contract the step
  was supposed to satisfy.
- **Output:** One of exactly three outcomes — Verified (Completed),
  Failed, or Unverified — with supporting evidence, per
  `docs/03-runtime/verifier.md`'s three verification outcomes.
- **Owns:** Verification logic (compile/test/lint/static-analysis/review
  pipeline, `verification-and-stop-conditions.md`).
- **Does NOT own:** Retrying the step itself (it recommends; the
  Executor or Planner acts).
- **Can:** Run read-only checks against ground-truth signals (primary)
  or vision-based re-inspection (fallback only), and compare against the
  contract.
- **Cannot:** Modify the artifact it is verifying; decide what happens
  next (retry, escalate, accept) — that decision belongs to the Planner,
  informed by the Verifier's outcome.
- **Must never:** Accept a result without evidence; assume success
  because "it looks right"; collapse Unverified into either Verified or
  Failed for convenience.
- **Dependencies:** Test runner, Static analysis tools, Confidence model
  (`docs/05-ai/confidence-propagation.md`).
- **Dependents:** Planner (receives verdicts to decide next step).
- **Communicates only through:** the Executor→Verifier contract.

## Plugin Host

- **Input:** Plugin manifest, capability requests.
- **Output:** A sandboxed, running plugin instance.
- **Owns:** Sandbox lifecycle, permission enforcement at the boundary.
- **Does NOT own:** The plugin's internal logic or private state.
- **Can:** Move a plugin between `Enabled` and `Disabled`, initiate
  `Updating`, and reach `Uninstalled` (per
  `docs/16-extensibility/plugin-lifecycle.md`'s actual lifecycle states
  — this entry previously used "suspend"/"kill", terms that don't
  appear in that document); enforce declared capability limits.
- **Cannot:** Modify a plugin's code at runtime; grant a capability not
  explicitly approved.
- **Must never:** Allow a plugin direct storage or internal-API access
  (`constraints.md`); let one plugin read another's sandboxed state.
- **Dependencies:** Permission Manager, Resource Manager.
- **Dependents:** Any subsystem that invokes a plugin-provided
  capability, always through the Tool Registry, never directly.
- **Communicates only through:**
  `docs/16-extensibility/plugin-lifecycle.md`'s public interface.

## Maintenance rule

If an implementation needs a subsystem to do something not listed under
its "Can," that is a signal to update this contract deliberately (with
an ADR if it changes a boundary) — not to add the behavior quietly and
leave this ledger stale. See `engineering-principles.md`, Principle 1.
