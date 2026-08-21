# Lifecycle & State Machine Index

## Purpose

A single index of every object in NOVA that has (or should have) a
defined lifecycle and state machine, per Sections 3 and 4 of the master
documentation outline. Most of these already exist in their owning
document; this file's job is to make sure none were skipped and to give
each one a canonical one-line summary and diagram reference in one
place.

## Scope

Indexes lifecycle/state-machine documentation across the repository.
Does not restate full transition tables — those remain in
`docs/26-system-reference/04-state-transition-tables.md` and each
object's owning document.

## System-wide lifecycle

- **Startup/shutdown sequence:** `docs/02-architecture/lifecycle.md`
- **Per-service lifecycle contract:** `docs/03-runtime/service-lifecycle.md`
  (Created → Initialized → Running → Paused → Cancelled → Recovering →
  Destroyed, implemented uniformly by every supervised service)

## Object lifecycles and state machines

| Object | Lifecycle / states | Canonical document |
|---|---|---|
| Task | `Created` → `Planning` → (`WaitingResources`/`WaitingUser`/`Paused`) → `Executing` → `Verifying` → `Completed`/`Unverified`/`Failed` → `Retrying` → `Planning`; `Cancelled` reachable from most non-terminal states (see `docs/03-runtime/task-manager.md` for the full guarded transition table and state definitions — that document is canonical per `docs/00-overview/normative-precedence.md`; `04-state-transition-tables.md`'s Task Lifecycle table is a derived copy that must match it) | `docs/03-runtime/task-manager.md` |
| Workspace | `Created` → `Active` ⇄ `Locked`; `Active`/`Locked` → `Recovering` → `Active` (no terminal/archived state — see owning document) | `docs/28-multi-device-protocol/10-identity-and-workspace.md` |
| Agent instance (Planner-delegated sub-goal execution, `docs/00-overview/terminology.md`'s "Agent") | `Spawned` → `Active` ⇄ `Blocked` → `Completed`/`Aborted` | `docs/05-ai/planner-agent.md` |
| Plugin | `Installed` → `Enabled` ⇄ `Disabled`, with `Updating`/`Deprecated` reachable from `Enabled`, terminating in `Uninstalled` | `docs/16-extensibility/plugin-lifecycle.md` |
| Session (conversation/chat) | `Active` ⇄ `Idle` (idle timeout / new message), `Idle` → `Expired` (extended idle timeout), `Expired` → `Active` (new message starts a new session, prior one linked) — conversation-session timeout only, never affects an in-progress Task's own state | `docs/26-system-reference/04-state-transition-tables.md`'s Session table (canonical for these states; grounded in `FM-06-019`/`FM-06-020`). This row previously cited `docs/28-multi-device-protocol/03-session-continuity-and-handoff.md`, a different concept (cross-device handoff mechanics) — that citation was wrong and has been corrected. |
| Checkpoint | Created → Valid → Superseded → (never mutated in place) | `docs/03-runtime/failure-recovery.md`, `system-invariants.md` |
| Memory Entry | Created → Indexed → Reinforced/Superseded → Archived/Deleted | `docs/04-memory/memory-lifecycle.md` |
| Permission Request | `Requested` → `Approved`/`Denied` (timeout resolves into `Denied`; no separate `Pending`/`Expired` state) | `docs/03-runtime/permission-manager.md`'s Permission Request states section (the runtime mechanism; `docs/10-security/permissions.md` is the policy this mechanism enforces, not the state machine's owner) |
| Event | Published → Delivered → Acknowledged/Retried → Dead-lettered | `docs/26-system-reference/07-event-catalog.md` |
| Workflow Node | Not a distinct state machine — a workflow node wraps exactly one Task-Manager-governed step, so its state is the Task state machine (`docs/03-runtime/task-manager.md`) applied per-node; the workflow instance's own state is the union of its nodes' Task states plus graph-level position. `docs/26-system-reference/04-state-transition-tables.md` previously listed a fabricated standalone Workflow Node enum here; corrected to this row instead of restating an invented one | `docs/17-workflow/workflow-engine.md`'s Workflow state section |
| Device (multi-device) — two independent dimensions, not one chain | **Trust:** `Unpaired` → (pairing sequence: Pair Code generated → QR scanned → Challenge/Response → Keys exchanged) → `Trusted`/`Paired` → `Unpaired` (on removal). **Presence** (only meaningful once Paired): `Online` ⇄ `Idle` ⇄ `Busy` ⇄ `Syncing` ⇄ `Updating` ⇄ `Sleeping` ⇄ `Offline` | Trust: `docs/28-multi-device-protocol/02-device-pairing-protocol.md`. Presence: `docs/28-multi-device-protocol/04-presence-and-capabilities.md`'s Presence states table (canonical for these exact 7 names — this row previously invented a different, simplified chain that matched neither source) |

## Objects without a previously dedicated state machine

**Permission Request** has been promoted into its owning document
(`docs/03-runtime/permission-manager.md`'s Permission Request states
section) as of this revision — no longer just reconstructed here.

**Session** (conversation/chat) is resolved via
`docs/26-system-reference/04-state-transition-tables.md`'s Session
table, grounded in `FM-06-019`/`FM-06-020` — this row's earlier citation
to the multi-device handoff document was simply wrong (different
concept) and has been corrected to point to the real source instead.

## Rule for new objects

Any new long-lived object added to the system (per
`docs/26-system-reference/14-data-models.md`) must have its state
machine added to this index in the same change, per the module checklist
(`docs/14-development/module-checklist.md`) — an entity with lifecycle
implications but no state machine is treated as an incomplete spec, not
a minor gap, since state machines are exactly what AI implementers
translate into code most reliably when given one, and most unreliably
when left to infer one.
