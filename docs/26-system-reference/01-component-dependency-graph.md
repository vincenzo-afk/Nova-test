# Component Dependency Graph

## Purpose

A module-composition tree an AI agent can read top-to-bottom to know what
must exist before what — distinct from `docs/02-architecture/dependency-map.md`'s service-level Mermaid graph (which encodes runtime
"depends on to function" edges for failure-domain reasoning). This
document encodes the same graph as a build/implementation tree, answering
"what order do I write and bring these modules up in" rather than "what
degrades if X goes down."

Both documents describe the same underlying dependency graph. If they
ever disagree, `docs/02-architecture/dependency-map.md` is authoritative (per `docs/00-overview/normative-precedence.md`, Tier 2 over a Tier 3 reference document) and
this file must be corrected to match, not the other way around.

## The tree

```
NOVA Runtime
├── Configuration Layer          (docs/14-development/configuration.md)
│   └── Secrets                  (docs/10-security/secrets.md)
├── Logging & Telemetry          (docs/13-devops/logging.md, monitoring.md)
├── Runtime Manager              (docs/03-runtime/runtime-manager.md)
│   ├── State Manager            (docs/03-runtime/state-manager.md)
│   ├── Resource Manager         (docs/03-runtime/resource-manager.md)
│   └── Permission Manager       (docs/03-runtime/permission-manager.md)
├── Memory                       (docs/04-memory/memory-architecture.md)
│   ├── Knowledge Graph          (docs/04-memory/knowledge-graph.md)
│   ├── Embeddings               (docs/04-memory/embeddings.md)
│   ├── Timeline                 (docs/04-memory/timeline.md)
│   └── Memory Storage           (docs/04-memory/memory-storage.md)
├── Observer Framework           (docs/03-runtime/observer.md)
│   └── Observer Sources         (docs/07-observers/*)
├── AI Layer
│   ├── Context Builder          (docs/05-ai/context-builder.md)
│   ├── Model Router             (docs/05-ai/model-router.md)
│   │   └── Provider Registry    (docs/18-providers/provider-routing.md)
│   ├── Capability Registry      (docs/05-ai/capability-registry.md)
│   └── Planner                  (docs/03-runtime/planner.md)
├── Tool Registry                (docs/06-tools/tool-registry.md)
│   └── MCP Client               (docs/06-tools/mcp.md)
├── Task Manager                 (docs/03-runtime/task-manager.md)
│   └── Scheduler                (docs/03-runtime/scheduler.md)
├── Executor                     (docs/03-runtime/executor.md)
├── Verifier                     (docs/03-runtime/verifier.md)
├── Workflow Engine              (docs/17-workflow/workflow-engine.md)
├── Extensibility
│   ├── Plugin Lifecycle         (docs/16-extensibility/plugin-lifecycle.md)
│   ├── Plugin Sandbox           (docs/16-extensibility/plugin-sandboxing.md)
│   └── Plugin Marketplace       (docs/16-extensibility/plugin-marketplace.md)
├── API Gateway                  (docs/08-api/rest-api.md)
├── UI Layer                     (docs/09-ui/ui-overview.md)
├── Voice                        (docs/22-voice/voice-assistant.md)
├── Multi-Device / Sync          (docs/20-devices/multi-device-architecture.md)
└── Autonomy Layer               (docs/23-autonomy/*)
```

Read `├──` as "is a child module of, and typically depends on being
initialized after, its parent." A child that appears under two branches
(e.g. Provider Registry under AI Layer, but also referenced by
`docs/18-providers/` directly) has its primary/owning branch listed here;
see `docs/02-architecture/dependency-map.md` for the full non-tree edge set (e.g. Verifier
also reads State Manager directly, a cross-branch edge a tree cannot
represent).

## Build order derived from this tree

A depth-first, dependencies-before-dependents read of the tree above
gives the same build order as `docs/14-development/implementation-order.md`
(Tier 3): Configuration/Secrets/Logging → Runtime Manager's own
sub-services → Memory → Observer → AI Layer → Tool Registry → Task
Manager → Executor/Verifier → Workflow Engine → Extensibility → API
Gateway → UI/Voice/Devices → Autonomy Layer. Autonomy Layer is last
because it is defined as building on top of every other layer being
functional (`docs/23-autonomy/self-growing-capability.md`).

## Related documents

- `docs/02-architecture/dependency-map.md` — authoritative service-level
  dependency graph (Mermaid, with full non-tree edges)
- `docs/02-architecture/lifecycle.md` — the startup sequence this order
  produces
- `docs/14-development/implementation-order.md` — build/test sequencing
  for contributors, Tier 3 detail
- `02-startup-sequence.md`, `03-shutdown-sequence.md` (this folder)

## Where This Breaks

This document is itself a build artifact an AI agent relies on. If it drifts from the real system, every agent that trusts it inherits the drift silently. The failures below are specific to *this document going stale or being wrong*, not to the subsystem it describes (see the cross-referenced FM files for that).

| ID | Failure | Trigger | Detection | Severity | Mitigation | Recovery |
|---|---|---|---|---|---|---|
| **FM-24-001** | Tree diverges from `docs/02-architecture/dependency-map.md` | A new module is added or an edge changes and only one of the two documents is updated. | CI doc-lint (see `11-documentation-lint-ci.md`) diffs the module list in both files and fails the build if they disagree. | Medium | Treat `docs/02-architecture/dependency-map.md` edits as required whenever this tree changes, enforced by a single PR-template checklist item, not memory. | Regenerate this tree from `docs/02-architecture/dependency-map.md` mechanically rather than hand-editing both independently. |
| **FM-24-002** | Agent infers a false dependency | Tree's parent-child nesting is read as a strict dependency when it was only an organizational grouping. | A build/implementation attempt fails because a step assumed an unnecessary prerequisite. | Low | State explicitly in this file (as done above) that nesting means typical dependency, not universal strict dependency; call out exceptions inline. | Consult `docs/02-architecture/dependency-map.md`'s explicit edge list to confirm before treating a nesting relationship as a hard blocker. |
| **FM-24-003** | Circular dependency introduced silently | A new module's edge, added to `docs/02-architecture/dependency-map.md` but not cross-checked against this tree, creates a cycle. | Same cycle-detection CI check referenced in `docs/02-architecture/dependency-map.md`'s Circular-dependency rule. | High | Never add an edge to either document without running the cycle-detection check locally first. | Revert the offending edge; resolve per `docs/02-architecture/dependency-map.md`'s guidance on breaking apparent mutual dependencies via event flow instead of a direct edge. |
