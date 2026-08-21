# Implementation Order — What an AI Coding Agent Builds First


## Purpose

A strict build sequence for any AI agent (or human) implementing NOVA from
this documentation. Building out of order is the single largest cause of
throwaway code in this project: e.g. writing the Workflow Engine before
the Planner/Executor contract exists, or writing plugin sandboxing before
the permission model it depends on exists.

This is the canonical build order — `docs/14-development/
implementation-order.md`'s older phase breakdown is superseded by this
one wherever the two disagree; that file now says so explicitly.

## Rule

**Never implement a component before every document it links to under
"Purpose" or "Scope" has been implemented, or is explicitly stubbed with
the exact interface the new component will call.** If a doc references
another doc's not-yet-built interface, stop and build that interface
first — even a minimal version — rather than guessing its shape.

## Canonical order

1. **Foundations** — `docs/00-overview/*` (read only, no code), then
   `docs/26-system-reference/01-component-dependency-graph.md` as the
   literal build graph.
2. **State & lifecycle primitives** — `docs/03-runtime/state-manager.md`,
   `docs/03-runtime/service-lifecycle.md`, `docs/26-system-reference/02-startup-sequence.md`,
   `03-shutdown-sequence.md`. Nothing else can be tested without these.
3. **Memory tier 0/1 (working + episodic)** — `docs/04-memory/memory-architecture.md` then `memory-storage.md`. Do not build the Knowledge Graph yet.
4. **Observers (minimal)** — enough of `07-observers/` to produce events
   the memory layer can store. One observer only (filesystem or clipboard)
   is enough to unblock the next step.
5. **Planner + Executor + Verifier** — `docs/03-runtime/planner.md`,
   `executor.md`, `verifier.md`, in that order, wired to
   `docs/05-ai/deterministic-first.md`'s decision function *before* any LLM
   call is added.
6. **Model Router + one provider** — `docs/05-ai/model-router.md` with exactly
   one provider implemented end-to-end (do not implement fallback chains
   until one path works).
7. **Tool registry + execution-priority chain** — `06-tools/`.
8. **Knowledge Graph + retrieval + ranking** — now that Planner/Executor
   exist to consume it, `docs/04-memory/knowledge-graph.md`, `retrieval-engine.md`,
   `memory-ranking.md`.
9. **UI shell (read-only chat)** — `docs/09-ui/chat.md` wired to Planner output
   only, no input actions yet.
10. **Security/permission layer** — `docs/10-security/permissions.md`,
    `permission-manager.md` (03-runtime) — must exist before any tool is
    allowed to take a destructive action.
11. **Extensibility (plugins)** — `16-extensibility/*`, only after step 10.
12. **Workflow Engine** — `docs/17-workflow/workflow-engine.md`, only after
    Planner/Executor/permissions are stable, since workflows are graphs of
    the same step primitives.
13. **Providers beyond the first, multi-device, voice, channels, autonomy,
    collaboration** — in the numeric doc order (18 → 24), each gated on
    its prerequisites being marked stable in
    `docs/26-system-reference/10-feature-maturity-table.md`.
14. **Everything under `43-ai-development/`, `45-code-perfection-failure-modes/`
    is read continuously, not built once** — these are guardrails, not a phase.

## For an AI agent: how to use this file

Before generating code for any ticket, locate the component in the list
above. If a prerequisite component is not yet implemented in the target
codebase, either implement the prerequisite first or explicitly declare
in the PR description which interface is being stubbed and why. Do not
silently assume a prerequisite's behavior.
