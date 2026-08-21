# Data Ownership

## Purpose

States, unambiguously, which module is the sole writer of each category
of durable state. Any module reading data it doesn't own must go through
the owning module's API — direct mutation from outside the owner is
always a bug, never a legitimate shortcut, regardless of how convenient
it looks for a one-off fix.

## Ownership table

| Owner | Owns | May be read by | Must never be mutated by |
|---|---|---|---|
| **Memory** | Conversation Tree, Embeddings, Knowledge Graph, Snapshots, Cache (memory-tier), Timeline | Any module, via Memory's read API | Runtime Manager, Planner, Executor, UI Layer, plugins — all must go through Memory's write API, never touch storage directly |
| **State Manager** | "Current truth" world-model view (`docs/03-runtime/world-model.md`) | Verifier, Planner, Context Builder | Observer (Observer *feeds* State Manager events; it does not write world-model state directly) |
| **Task Manager** | Task records, task state transitions, task queue | Scheduler, API Gateway, UI Layer | Executor, Planner (they request transitions via Task Manager's API; they do not flip task state fields directly) |
| **Tool Registry** | Tool catalog, tool schema metadata, tier metadata | Planner, Executor, Capability Registry | Individual tool integrations (a tool registers itself once; it does not later rewrite its own catalog entry outside the registration API) |
| **Capability Registry** | Capability-to-provider/tool mapping | Planner, Model Router | Providers directly (providers advertise capabilities; the registry, not the provider, is authoritative for what's actually enabled) |
| **Provider Registry / Model Router** | Provider health state, routing decisions, fallback ordering | Planner, Executor | Individual provider adapters (an adapter reports health; it does not set its own routing priority) |
| **Permission Manager** | Granted permission scopes, consent records | Executor, Tool Registry, Plugin lifecycle | Any module requesting a permission (requesting is not granting — only the user-facing consent flow, mediated by Permission Manager, may grant) |
| **Resource Manager** | Lock state for contended resources | Executor, Task Manager | Locking is exclusively acquired/released via Resource Manager's API — no module holds a lock it didn't request through it |
| **Configuration Layer** | Live configuration values | Every module (read-only) | Every module except the configuration-management/admin path itself; a module must never persist a config change by writing the config store directly |
| **Session Manager** | Session records, conversation state | UI Layer, API Gateway | Plugins, Tool executions (they may *read* session context passed to them; they do not write back to session state directly) |
| **Plugin Runtime** | Plugin-declared private state (per-plugin sandboxed storage) | Only the owning plugin itself | Every other plugin, and NOVA core itself outside of lifecycle/uninstall cleanup |
| **Audit Log** | Security/action audit trail | `docs/10-security/audit.md` consumers, incident response tooling | Every module — audit entries are append-only; nothing may edit or delete a written entry outside of a documented, access-controlled retention policy |

## The rule in one sentence

If a module needs to change data it doesn't own, it calls the owner's
API and lets the owner enforce its own invariants (validation, conflict
resolution, audit logging) — it never reaches into the owner's storage
directly, even for "just this once."

## Why this matters more than it looks

Almost every entry in `docs/25-failure-modes/FM-03-agent-orchestration-and-collaboration.md` (race conditions, one agent overwriting another's
work) and `FM-10-desktop-android-distributed-sync.md` (split-brain,
conflicting updates) is, at root, a data-ownership violation: two writers
where only one should exist. This table exists to make "only one writer"
checkable at design-review time, before the race condition is ever
written into code.

## Related documents

- `docs/02-architecture/service-architecture.md`'s Ownership boundary rule
- `docs/25-failure-modes/FM-03-*.md`, `FM-10-*.md` — the runtime
  consequences of violating this table
- `docs/10-security/permissions.md` — Permission Manager's grant authority

## Where This Breaks

This document is itself a build artifact an AI agent relies on. If it drifts from the real system, every agent that trusts it inherits the drift silently. The failures below are specific to *this document going stale or being wrong*, not to the subsystem it describes (see the cross-referenced FM files for that).

| ID | Failure | Trigger | Detection | Severity | Mitigation | Recovery |
|---|---|---|---|---|---|---|
| **FM-24-013** | New module added without an ownership entry | A new subsystem introduces a new data category and no one adds a row to this table. | Design/code review checklist item requires a data-ownership entry for any new persisted data category before merge. | Medium | Make a data-ownership table entry a mandatory field in the module-addition template referenced by `docs/14-development/module-checklist.md`. | Backfill the missing entry; audit the new module's read/write paths against the backfilled rule. |
| **FM-24-014** | Direct-mutation shortcut ships 'temporarily' and becomes permanent | Under deadline pressure, a module writes another owner's storage directly 'just this once,' and the shortcut is never removed. | Static analysis / dependency-boundary lint flags cross-module writes that don't go through an owner's public API. | High | Enforce ownership boundaries at the code level (module visibility, not just documentation) so a direct-mutation shortcut fails to compile/lint rather than merely being discouraged. | Refactor the shortcut into a proper API call through the actual owner; treat any data corruption traceable to the shortcut per the relevant `FM-01`/`FM-14` recovery procedure. |
| **FM-24-015** | Ownership table itself drifts from the dependency graph | This table and `01-component-dependency-graph.md`/`docs/02-architecture/dependency-map.md` describe overlapping structure but could describe it inconsistently after independent edits. | Periodic cross-document review, ideally automated by the doc-lint process (`11-documentation-lint-ci.md`). | Low | Cross-reference this table's owners against the module list in the dependency graph during any review of either document. | Reconcile the specific inconsistency; treat as input for improving the doc-lint automation to catch this class of drift going forward. |
