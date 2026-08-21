# Component Dependency Map

## Status: derived view — canonical source is elsewhere

`docs/02-architecture/dependency-map.md` is the authoritative,
service-level dependency graph (see
`docs/26-system-reference/01-component-dependency-graph.md`, which
states this explicitly). This file is a task-oriented restatement of
that same graph, formatted as a prose chain for quick scanning during
implementation planning rather than as the full Mermaid diagram. If this
file and `docs/02-architecture/dependency-map.md` ever disagree, the
architecture-layer file is correct and this file is stale — fix this
file to match it, never the other way around, per
`docs/00-implementation-governance/documentation-precedence.md`.

## Purpose

Explicit "depends on" edges between NOVA subsystems, so an AI agent can
check whether a component it is about to modify has downstream consumers
that will break.

## Core dependency chain

```
State Manager ─┬─> Service Lifecycle ─> everything else (boot order)
                └─> Memory Storage ─> Knowledge Graph ─> Retrieval Engine ─> Memory Ranking
Observers ─────────> Memory Storage (writes)
Planner ───────────> Deterministic-First check ─> Model Router ─> Provider Interface
Planner ───────────> Executor ─> Tool Registry ─> Permission Manager
Executor ──────────> Verifier ─> Memory Storage (writes outcome)
Workflow Engine ───> Planner-Executor Contract (reuses step primitives)
Plugin Architecture > Tool Registry + Permission Manager + Sandboxing
Multi-device Sync ─> State Manager + Memory Versioning + Conflict Resolution
UI (Chat/Overlay) ─> Planner (read) + Executor (action dispatch)
Autonomy features ─> Permission Escalation + Workflow Engine
Voice Assistant ───> Observers (audio) + Planner + TTS provider
```

## High fan-in components (changing these has the widest blast radius)

1. **Memory Storage** — read/written by every tier, every observer, the
   Knowledge Graph, sync, and most autonomy features. Any schema change
   here requires a migration doc (`docs/38-disaster-recovery/migration.md`)
   and a compatibility check (`docs/26-system-reference/09-version-compatibility-matrix.md`).
2. **Tool Registry / Permission Manager** — every tool, plugin, and
   workflow node routes through this. A behavior change here changes
   what every existing tool is allowed to do.
3. **State Manager** — governs startup order; a change to its contract
   can silently reorder service boot and reintroduce race conditions
   already fixed elsewhere.
4. **Provider Interface** — every model call, every provider (local or
   cloud) implements this; a breaking change here breaks routing,
   fallback, and cost tracking simultaneously.

## Rule for an AI agent

Before modifying any of the four components above, grep the entire
documented interface surface for its current contract and enumerate every
consumer doc that references it. If more than one subsystem doc
references the interface being changed, this is a breaking-change-level
task requiring updates to every referencing doc in the same change, not a
follow-up.
