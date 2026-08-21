# Planner → Executor Contract

## Purpose

The strict, literal schema for the handoff between Planner and Executor,
and between Executor and Verifier — the single most implementation-
critical interface boundary in the runtime, since a mismatch here is the
most likely source of integration bugs between independently-built
components.

## Scope

Wire-level schema for these two handoffs specifically. The broader
planning algorithm is `docs/03-runtime/planner.md`; the Executor's own
internal behavior is `docs/03-runtime/executor.md`.

## Planner output → Executor input

```json
{
  "step_id": "string, unique within the task",
  "task_id": "string",
  "correlation_id": "uuid",
  "capability_id": "string, per docs/05-ai/capability-registry.md",
  "resolved_tool_id": "string, per docs/06-tools/tool-registry.md",
  "action_id": "string, the specific action on that tool, per docs/06-tools/tool-interface.md",
  "parameters": { "...typed, tool-specific parameters..." },
  "risk_tier": "read_only | reversible_write | destructive_irreversible, per docs/10-security/permissions.md's Execution risk tiers table (this field carries that value, it is not defined here)",
  "execution_tier": "native_runtime | internal_function | api | mcp | cli | accessibility | vision | keyboard_mouse",
  "required_locks": ["array of resource identifiers, per docs/03-runtime/resource-manager.md"],
  "timeout_ms": "integer, per docs/03-runtime/failure-recovery.md timeout strategy",
  "confirmation_status": "not_required | pending | approved | denied"
}
```

The Planner never emits a step with `confirmation_status: "approved"`
directly — that field is only ever set by the Permission Manager
(`docs/03-runtime/permission-manager.md`) after its own gate has run; the
Planner emits `not_required` or `pending` only.

## Executor output → Verifier input (and Planner, via Task Manager)

```json
{
  "step_id": "string, matches the input step_id",
  "status": "success | failure | partial",
  "evidence": {
    "type": "exit_code | api_response | file_hash | accessibility_state | none",
    "value": "the actual signal"
  },
  "affected_resources": ["array of resource identifiers actually touched"],
  "error": {
    "category": "transient | permanent | user | external | security | validation | internal",
    "message": "string"
  }
}
```

`error` is present only when `status` is `failure` or `partial`, and its
`category` field uses the failure taxonomy in `docs/03-runtime/failure-recovery.md` — this is what allows the Planner's
replan decision to be driven by category, not by parsing a free-text
error message.

## Verifier output → Task Manager

```json
{
  "step_id": "string",
  "outcome": "verified | unverified | failed",
  "confidence": "0.0-1.0, per docs/05-ai/confidence-propagation.md",
  "verification_method": "ground_truth | vision_secondary",
  "explanation": "string, human-readable"
}
```

## Contract invariants

Per `docs/00-overview/system-invariants.md`, `step_id` and `task_id` are
immutable once assigned and are propagated unchanged through every stage
of this contract — a Verifier output always traces back to exactly one
Executor output and exactly one Planner-emitted step via matching
`step_id`, with no renaming or reissuing across the chain.

## Why this is specified as a strict schema rather than left to each
component's own judgment

Two independently built or updated components (e.g., a new Executor
implementation and an existing Planner) must interoperate without either
needing to inspect the other's source code — this schema is what makes
that possible, and is the concrete artifact
`docs/14-development/module-contract-standard.md`'s general "input/
output/errors" convention resolves to for this specific, most-traversed
interface in the system.

## Related documents

- `docs/25-failure-modes/FM-02-planner-task-queue-scheduler.md` — failure modes for this component
- `docs/03-runtime/planner.md`, `executor.md`, `verifier.md` — the
  components on either side of this contract
- `docs/06-tools/tool-interface.md` — the underlying tool-level contract
  this step schema wraps
- `docs/03-runtime/failure-recovery.md` — the error taxonomy referenced
  above
