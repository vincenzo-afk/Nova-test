# Ownership Boundaries

## Purpose

States, explicitly and per responsibility, which single component owns
each piece of behavior or state — not merely what each component does
(already covered per-component in `docs/02-architecture/service-architecture.md`), but who is *authoritative* for a given
responsibility, so that responsibilities do not slowly overlap as new
capability is added.

## Scope

Ownership assignment for the responsibilities most likely to be
ambiguous or contested as the system grows. This is the companion
document to `docs/00-overview/system-invariants.md` — invariants state
what must hold; this document states who is responsible for making it
hold.

## Ownership table

| Responsibility | Owner | Never owned by |
|---|---|---|
| Planning, decomposition, step sequencing | Planner (`docs/03-runtime/planner.md`) | Agent instances, UI Layer |
| Execution, tool invocation, retries at the step level | Executor (`docs/03-runtime/executor.md`) | Planner, Tool Registry |
| Task-level retry/replan decisions | Planner, via Task Manager's `Retrying` state (`docs/03-runtime/task-manager.md`) | Executor |
| Persistence, retrieval, indexing | Memory + Knowledge Graph services (`docs/04-memory/memory-architecture.md`) | Planner, UI Layer |
| Environment/desktop state representation | World Model (`docs/03-runtime/world-model.md`) | Individual Observers (they feed it, not own the consolidated view) |
| Conflict resolution for current-truth state | State Manager (`docs/03-runtime/state-manager.md`) | World Model (which consumes State Manager's resolution, not performs it) |
| Risk-tier classification and confirmation gating | Permission Manager (`docs/03-runtime/permission-manager.md`) | Executor, individual tools |
| Resource lock arbitration | Resource Manager (`docs/03-runtime/resource-manager.md`) | Scheduler, Executor |
| Task dispatch ordering | Scheduler (`docs/03-runtime/scheduler.md`) | Task Manager |
| Tool cataloging and metadata | Tool Registry (`docs/06-tools/tool-registry.md`) | Tool Selection, Planner |
| Capability-to-tool resolution | Tool Selection (`docs/05-ai/tool-selection.md`) | Planner (which selects a capability, not a specific tool) |
| Named-capability abstraction | Capability Registry (`docs/05-ai/capability-registry.md`) | Tool Registry (a lower layer it sits above) |
| Model/provider selection for a given call | Model Router (`docs/05-ai/model-router.md`) | Planner, Reasoning Engine |
| Plugin lifecycle and sandboxing | Plugin Manager (`docs/16-extensibility/plugin-lifecycle.md`, `plugin-sandboxing.md`) | Tool Registry (which only sees the tools a plugin registers, not its lifecycle) |
| Verification of action outcomes | Verifier (`docs/03-runtime/verifier.md`) | Executor, the tool being verified |

## Ownership principles

- **Exactly one owner per responsibility.** Where two components appear
  to jointly need a responsibility, one is designated the owner and the
  other becomes a consumer of that owner's output — see
  `docs/02-architecture/dependency-rules.md` for how this is enforced as
  an actual dependency-direction rule, not only a documentation
  convention.
- **An owner's decision is authoritative within its scope.** The
  Verifier's outcome is authoritative for "did this succeed" — the
  Planner does not second-guess a `Failed` verification by treating it as `Completed` based on its own confidence in the plan.
- **Ownership does not imply exclusive access.** Memory is owned by the
  Memory/Knowledge Graph services for writes, but is read by many
  components (Planner, Context Builder, UI surfaces) — ownership governs
  who may *change* authoritative state, not who may *read* it.

## Resource ownership table

Distinct from the responsibility table above, this table assigns
ownership of specific literal resources — the concrete things a
component could otherwise claim jointly and create circular ownership
around:

| Resource | Owner | Notes |
|---|---|---|
| Memory storage (structured/vector/graph/blob) | Memory + Knowledge Graph services | See `docs/04-memory/memory-storage.md` |
| Configuration | The Configuration subsystem (`docs/14-development/configuration.md`) | Read by every component; written only through the scoped precedence model, never directly by an individual service |
| Cache | Owned per-cache by whichever component populates it (Model Router owns its routing-decision cache, Retrieval Fusion Engine owns its own) | No shared, generic cache with multiple writers — see `docs/11-performance/caching.md` |
| World Model | World Model service (`docs/03-runtime/world-model.md`) | Fed by Observers, but Observers do not write directly into it — they publish events; World Model consumes them |
| Embeddings | Memory service, specifically the embedding-generation stage of indexing | `docs/04-memory/embeddings.md` |
| Browser session/state | Browser Observer (`docs/07-observers/browser.md`) | The Observer owns the read-only view; NOVA does not maintain its own separate browser session or cookie store |
| Tool Registry | Tool Registry service (`docs/06-tools/tool-registry.md`) | Populated by native/MCP/CLI/API/plugin sources, but only the registry itself mutates its own catalog |
| Plugins (installed packages, lifecycle state) | Plugin Manager (`docs/16-extensibility/plugin-lifecycle.md`) | Tool Registry only sees the tools a plugin registers, not the plugin's lifecycle state itself |
| Logs | The logging subsystem (`docs/13-devops/logging.md`) | Every service writes to it, but only the logging subsystem manages retention/rotation |
| Telemetry / self-monitoring data | Monitoring subsystem (`docs/13-devops/monitoring.md`) | Aggregates signals from every service; no service maintains its own separate telemetry store |

## Related documents

- `docs/00-overview/system-invariants.md` — what must hold; this
  document states who is responsible for it holding
- `docs/02-architecture/dependency-rules.md` — the enforced dependency
  direction this ownership model implies
- `docs/02-architecture/service-architecture.md` — the per-component
  responsibility detail this table summarizes at a cross-cutting level
