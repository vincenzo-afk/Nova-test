# Feature Priority

## Purpose

States, explicitly, which subset of `feature-list.md` is required for a
minimum viable version of NOVA versus what is a later enhancement. This
document exists because the original NOVA concept treated all capabilities
as equally foundational, which meant nothing was shippable until nearly
everything existed — this document is the direct fix.

## Scope

Applies to prioritization and sequencing decisions only. It does not
introduce any feature not already listed in `feature-list.md`.

## The v1-critical set (the "keep only 20%")

If every other feature were removed, these seven are what remain, because
every other capability depends on them existing first:

1. **Observation** — without it, there is nothing to remember.
2. **Memory** — without it, there is no persistence across sessions.
3. **Knowledge Graph** — without it, relationships between entities are
   not queryable, only individual facts.
4. **Planner** — without it, no task can be broken down or routed to
   deterministic vs. LLM execution.
5. **Executor** — without it, nothing can act, even at the safest tier.
6. **Verifier** — without it, "the task succeeded" is only ever an
   assumption, which this project's foundational review identified as a
   critical failure mode.
7. **Tool Registry** — without it, the Executor has nothing to select
   from, and the execution-priority chain has nothing to enforce.

These seven map directly to Phase 1 and Phase 2 on `ROADMAP.md`.

## Everything else is an enhancement

This includes, explicitly: multi-step orchestration (Phase 3), GUI/vision
control (Phase 4), universal provider/MCP plug-in generality and
multi-device sync (Phase 5), the full UI surface beyond a single working
interface, and any performance optimization beyond the budgets in
`docs/11-performance/performance-goals.md` (Tier 3) needed to make the
critical set usable.

"Enhancement" does not mean "unimportant" — it means "does not block the
critical set from being real and useful on its own."

## Why this ordering, not another

An earlier alternative considered was building the critical set and a
single flagship "wow" execution capability (e.g., full GUI automation) in
parallel, on the theory that pure observation-and-memory undersells the
project's ambition. This was rejected: GUI/vision automation is the least
mature, most maintenance-heavy, and highest-risk capability in the entire
system (see `docs/06-tools/vision.md`, Tier 3, and
`docs/10-security/threat-model.md`, Tier 3), and building it before the
undo/verification/permission scaffolding from the critical set exists
means any early demo of it would be running without the safety net the
rest of this repository assumes is already in place.

## Related documents

- `feature-list.md` — the full feature set this document prioritizes
- `project-scope.md` — the resulting authoritative v1 boundary
- `ROADMAP.md` — how this priority list maps to build phases
