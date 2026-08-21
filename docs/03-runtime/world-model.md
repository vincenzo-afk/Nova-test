# World Model

## Purpose

Maintains a live, queryable model of the current desktop state — which
applications are running, which window has focus, current clipboard
content, current project context — as distinct from Memory's historical
record. Where Memory answers "what happened," the World Model answers
"what is true right now."

## Scope

Current-state modeling only. Historical state lives in Memory
(`docs/04-memory/`); resolving conflicts between disagreeing observations
about current state is State Manager's responsibility
(`docs/03-runtime/state-manager.md`), which the World Model is built on
top of.

## Tracked state

- Running applications and their process state
- Open windows, their titles, and which one has OS focus
- Current clipboard content (text/type, not necessarily full content,
  depending on permission scope)
- Current mouse and keyboard focus context
- The currently "active" project, inferred from which files/windows are
  in focus and cross-referenced against the Knowledge Graph's project
  entities

## Object model (entity hierarchy)

The World Model represents tracked state as a hierarchy, not a flat list:
Application → Windows belonging to it → (where relevant) the file or
document a window represents. This hierarchy exists so that a query like
"is my editor open" resolves at the Application level while "which file
is focused right now" resolves at the Window level, without requiring
every consumer to independently reconstruct the relationship between an
application and its windows. This hierarchy is a live, ephemeral
structure, distinct from — but cross-referenced against — the Knowledge
Graph's durable Application and File node types
(`docs/04-memory/ontology.md`).

## Spatial model

For multi-monitor and multi-virtual-desktop setups, the World Model
tracks each window's monitor, virtual desktop, and z-order (which window
is topmost/visible versus obscured) — this is "spatial" in the sense
relevant to a desktop environment specifically, not a general 3D or
physical-space model. Z-order matters directly for GUI automation
(`docs/06-tools/automation.md`): a window with OS focus can still be
partially or fully obscured by another window, which affects whether a
vision-based interaction targeting it is actually looking at what it
expects to see.

## Temporal reasoning

Beyond the staleness detection below, the World Model retains a short
rolling window of recent state transitions (not full history — that is
Memory's role, `docs/04-memory/memory-lifecycle.md`) sufficient to answer
"was this window open a moment ago" or "did focus just change" without
querying Memory for what is still very recent, ephemeral context. This
rolling window is bounded and does not grow — it is a sliding buffer, not
an accumulating log.

## Uncertainty and confidence

Every World Model entry carries a confidence value, using the same
confidence model as memory generally (`docs/04-memory/memory-confidence.md`) rather than a separate, disconnected scheme — an
entry not recently corroborated (per staleness detection below) has
reduced confidence, and low-confidence entries are treated more
conservatively wherever they feed a risk-tier decision, consistent with
`docs/05-ai/confidence-propagation.md`'s weakest-link combination rule.

## Causal attribution

Per `docs/03-runtime/observer.md`'s correlation mechanism, every tracked
state change is attributed to either a specific in-flight NOVA task
(via `correlation_id`) or to independent user/external activity — this
is the World Model's "causal" reasoning in the concrete sense that
matters here: not general cause-effect inference about arbitrary
phenomena, but specifically distinguishing "NOVA caused this" from
"something else caused this," which is required for correct Memory
attribution and for avoiding the World Model misinterpreting its own
actions as new information about user behavior.

## What the World Model deliberately does not do (simulation limits)

The World Model is a **state tracker**, not a predictive simulator. It
does not model application internals, does not simulate how an
application would behave under hypothetical inputs, and does not
maintain a general physical or logical simulation of the desktop
environment beyond the concrete, observable state described above. Where
a "prediction" is needed, it takes the narrow, concrete form described
below — never a general counterfactual ("what would happen if...")
simulation, which is out of scope for a desktop state tracker and is not
planned for any phase.

## Predicted outcome preview (the scoped form of "prediction" here)

Before a risk-tier-gated action executes, the Planner can request a
**predicted outcome preview** from the combination of the current World
Model state and the action's declared effect
(`docs/06-tools/tool-interface.md`'s `affected_resources`) — a concrete,
narrow statement like "this will move file X from folder A to folder B"
rather than a general simulation of consequences. This preview is what
populates the plain-language description in a confirmation prompt
(`docs/10-security/permissions.md`) and the `why_this_plan` field in `docs/05-ai/explainability.md` — it is a direct description of a specific
planned action's declared effect, not a forecast of downstream
consequences beyond that action itself.

## Continuous update, not polling

The World Model is updated by consuming Observer events as they arrive
(`docs/03-runtime/observer.md`), not by polling OS state on a timer. This
keeps it current with minimal latency and avoids the resource cost of
constant active polling, consistent with the resource budget in
`docs/11-performance/resource-usage.md` (Tier 3).

## Staleness detection

An entry in the World Model carries a last-updated timestamp per field.
Before any Executor action that depends on current focus/window state
(e.g., a GUI-automation step, `docs/06-tools/vision.md`), the Executor
re-validates the specific field it depends on against the World Model's
current value rather than trusting a snapshot taken earlier in planning —
this is the mechanism behind the "user changes window during automation"
edge case in `docs/01-product/use-cases.md`: if the focused window has
changed since the plan was built, execution pauses and the Planner
re-evaluates rather than acting against a stale assumption.

## Handling missed or contradictory signals

An application can terminate without a clean OS notification (a crash),
leaving a stale "running" entry. The World Model treats any entry not
refreshed within a configured maximum age as unconfirmed rather than
true, and triggers an active re-check (via State Manager,
`docs/03-runtime/state-manager.md`) before that entry is relied upon by
a pending task.

## Relationship to Knowledge Graph

The World Model is ephemeral and does not persist beyond the current
session in its raw form — only summarized, verified facts derived from it
(e.g., "project X was actively worked on between these times") are
promoted into Memory and the Knowledge Graph, per the memory-lifecycle
promotion rules (`docs/04-memory/memory-lifecycle.md`).

## Related documents

- `docs/25-failure-modes/FM-15-architecture-runtime-lifecycle-events.md` — failure modes for this component
- `state-manager.md` — conflict resolution this model relies on
- `docs/03-runtime/observer.md` — the event stream this model is built
  from
- `docs/04-memory/memory-lifecycle.md` — how World Model facts get
  promoted into durable memory
- `docs/04-memory/memory-confidence.md` — the confidence model this
  document's Uncertainty section reuses
- `docs/05-ai/confidence-propagation.md` — how World Model confidence
  combines with other sources for risk-tier decisions
- `docs/05-ai/explainability.md` — the consumer of the predicted outcome
  preview described above
