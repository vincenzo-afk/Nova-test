# Service Architecture

## Purpose

The authoritative per-service responsibility breakdown for every service
introduced in `docs/00-overview/architecture-summary.md`. Where that
document gives a one-line responsibility per service, this document gives
inputs, outputs, dependencies, and failure-domain boundaries for each.

## Scope

Responsibility and interface boundaries only. Internal algorithms live in
`docs/03-runtime/`, `docs/04-memory/`, `docs/05-ai/`, and `docs/06-tools/`
as referenced per service below.

## Service inventory

| Service | Inputs | Outputs | Depends on | Detailed in |
|---|---|---|---|---|
| Observer | OS-level events (filesystem, window, browser, etc.) | Normalized event envelopes on the bus | User permission grants | `docs/03-runtime/observer.md`, `docs/07-observers/` (Tier 3) |
| Runtime Manager | Service health signals | Start/restart commands | None (root supervisor) | `docs/03-runtime/runtime-manager.md` |
| Scheduler | Queued tasks | Dispatch decisions | Task Manager | `docs/03-runtime/scheduler.md` |
| Task Manager | Task requests, step results | Task state transitions | State Manager | `docs/03-runtime/task-manager.md` |
| State Manager | Observer events | Resolved "current truth" | Observer | `docs/03-runtime/state-manager.md` |
| Memory | Normalized events, task outcomes | Tiered memory records | Observer, Task Manager | `docs/04-memory/memory-architecture.md` |
| Knowledge Graph | Extracted entities/relationships | Queryable graph | Memory | `docs/04-memory/knowledge-graph.md` |
| Planner | User goal, retrieved context | Step-by-step plan | Memory, Knowledge Graph, Model Router | `docs/05-ai/planner-agent.md`, `docs/03-runtime/planner.md` |
| Model Router | LLM call requests | Selected provider/model | Configured providers | `docs/05-ai/model-router.md` |
| Tool Registry | Tool registration calls | Tool catalog, tier metadata | None | `docs/06-tools/tool-registry.md` |
| Executor | Selected tool call | Structured execution result | Tool Registry, Resource Manager | `docs/03-runtime/executor.md` |
| Verifier | Execution result | Verified / unverified / failed | Executor, State Manager | `docs/03-runtime/verifier.md` |
| Resource Manager | Lock requests | Granted/queued locks | None | `docs/03-runtime/resource-manager.md` |
| Permission Manager | Action + risk tier | Allow / require confirmation / deny | `docs/10-security/permissions.md` (Tier 3) | `docs/03-runtime/permission-manager.md` |
| API Gateway | External SDK/REST/WebSocket calls | Routed internal requests | All above | `docs/08-api/` (Tier 3) |
| UI Layer | User input | Rendered state, task requests | API Gateway | `docs/09-ui/` (Tier 3) |

## Failure domain rule

Per Principle 3 (`docs/00-overview/design-principles.md`), each row above
is an independent process (see `system-architecture.md`). A crash in any
one service must degrade only the capabilities that specifically depend on
it, not the whole system. Concretely: if the Model Router process crashes,
purely deterministic tasks (see `docs/05-ai/deterministic-first.md`) must
continue to function, since they never call it.

## Ownership boundary rule

No service directly mutates another service's owned state. For example,
the Executor never writes directly to Memory — it returns a result to Task
Manager, which is what triggers a Memory write. This indirection is what
keeps the dependency map in `docs/02-architecture/dependency-map.md` accurate and prevents
undocumented coupling from accumulating.

## Related documents

- `docs/00-overview/architecture-summary.md` — the one-page version
- `docs/02-architecture/dependency-map.md` — the dependency graph implied by the table above,
  made explicit
- `communication-model.md` — how services actually exchange the
  inputs/outputs listed above
