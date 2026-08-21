# Feature Maturity Table

## Purpose

States, per feature/capability area, whether it is `Planned`,
`Experimental`, `Stable`, or `Deprecated` — so an agent building on top
of NOVA (or a user deciding whether to rely on something) knows how much
to trust it, distinct from whether it exists at all. Organized by the
same capability groupings as `docs/01-product/feature-list.md`.

## Maturity levels

These are the same levels as `docs/14-development/feature-flags.md`'s
canonical maturity lifecycle, with one addition (`Planned`) for the
state that precedes it — nothing here is a competing definition:

- **Planned** — documented/designed but not yet implemented; precedes
  `docs/14-development/feature-flags.md`'s lifecycle entirely (there is
  no flag for something with no code yet); referencing it as available
  is a documentation bug (see "Where This Breaks" below).
- **Experimental** — functional, but the interface/behavior may change
  without a deprecation window; not recommended as a hard dependency for
  other in-progress work; off by default per the canonical model.
- **Beta** — on by default for users who opted into a beta channel;
  reduced but present reliability expectations, per the canonical model.
  (No row in the table below currently sits at this level — it exists
  in the level list for completeness and because the canonical model
  requires every Experimental feature to pass through it en route to
  Stable, not because it's unused in principle.)
- **Stable** — API/behavior contract is fixed; breaking changes require
  the deprecation-window process.
- **Deprecated** — superseded; scheduled for removal per an active ADR.
- **Removed** — no longer available. (Also currently unused in the table
  below — nothing has completed the full lifecycle yet.)

## Table

| Capability Area | Maturity | Notes |
|---|---|---|
| Understand (intent parsing, ambiguity resolution) | Stable | Core v1 capability |
| Remember (Memory, Knowledge Graph, embeddings) | Stable | Core v1 capability |
| Observe (Observer framework, core OS sources) | Stable | Core v1 capability |
| Reason (Planner, Model Router, deterministic-first) | Stable | Core v1 capability |
| Act (Executor, Tool Registry, core tools) | Stable | Core v1 capability |
| Verify (independent verification, Unverified state) | Stable | Core v1 capability |
| Orchestrate (Task Manager, Scheduler) | Stable | Core v1 capability |
| Integrate (Tool ecosystem, early API) | Stable | Core v1 capability |
| Provider-agnostic routing (multi-provider, fallback) | Stable | v5, now foundational |
| Multi-device architecture, cross-device memory | Experimental | v5; sync/conflict-resolution edge cases (`FM-10`) still maturing |
| Android companion | Experimental | v5; UI/permission surface evolves with each Android release |
| Messaging channel adapters (Telegram, Discord, WhatsApp) | Experimental | v5; extensible framework is stable, individual adapters vary in maturity |
| Voice assistant (always-listening, wake word) | Experimental | v5; accuracy/latency still being tuned per `docs/22-voice/` |
| Autonomous capability growth (self-growing capability) | Experimental | v5; gated heavily by Policy Engine (`FM-18`) given the stakes of getting this wrong |
| Background life assistant | Experimental | v5; depends on autonomy layer above |
| Plugin marketplace | Experimental | v5; review/vetting process (`FM-19-001`) still being hardened |
| Workflow engine (branching, parallel execution) | Stable | v5, but built on the stable v1 execution core |
| Multi-agent collaboration (Planner→Coder→Reviewer→Tester→Verifier) | Experimental | v5; arbitration/disagreement handling (`FM-03-015`) actively evolving |
| Browser as first-class reasoning surface | Experimental | v5 |
| AI phone / distributed task scheduling across Full Peers | Planned | v5-scoped but not yet implemented as of this document's writing |

## The rule for using this table

An agent implementing a new feature that depends on something marked
`Planned` must either treat that dependency as out of scope for the
current milestone or explicitly flag the cross-dependency in its own
design doc — building on top of a `Planned` capability as if it were `Stable` is how integration work silently stalls waiting on something
that was never actually shipped.

## Related documents

- `docs/01-product/feature-list.md` — the underlying capability
  breakdown this table assigns maturity to
- `docs/15-decisions/adr-0008-v5-architecture-evolution.md` — why the v5
  row of capabilities exists and its scope
- `docs/14-development/feature-flags.md` — the canonical maturity-level
  lifecycle and behavioral gating this table's `Maturity` column values
  are defined by

## Where This Breaks

This document is itself a build artifact an AI agent relies on. If it drifts from the real system, every agent that trusts it inherits the drift silently. The failures below are specific to *this document going stale or being wrong*, not to the subsystem it describes (see the cross-referenced FM files for that).

| ID | Failure | Trigger | Detection | Severity | Mitigation | Recovery |
|---|---|---|---|---|---|---|
| **FM-24-027** | Table claims Stable for something still Experimental in practice | A feature's maturity label isn't downgraded after a spate of production issues reveals it's not actually stable. | Incident frequency for a 'Stable'-labeled feature is tracked; a sustained spike triggers a maturity-label review. | Medium | Tie maturity labels to an objective bar (e.g. incident rate, breaking-change frequency) reviewed periodically, not just a one-time judgment call at ship time. | Downgrade the label immediately upon discovering the mismatch; communicate the downgrade to anyone who may have built a hard dependency on the false Stable claim. |
| **FM-24-028** | Agent builds a hard dependency on a Planned feature | Table isn't consulted before starting implementation work that assumes a Planned capability already exists. | Design review catches the dependency on a capability with no corresponding Stable/Experimental entry. | Medium | Make consulting this table (and `feature-list.md`) a required step in `docs/14-development/implementation-order.md`'s planning phase for new work. | Descope the dependent work until the Planned capability ships, or explicitly implement the missing piece as part of the current effort with its own maturity label. |
| **FM-24-029** | Deprecated feature isn't actually removed on schedule | A feature marked Deprecated lingers past its ADR-specified removal date, confusing anyone relying on this table's freshness. | Periodic audit cross-references Deprecated entries against their governing ADR's stated removal timeline. | Low | Tie Deprecated status to a tracked ADR with an explicit removal milestone, not an open-ended label. | Either complete the removal or update the ADR/table with a revised, justified timeline — never let 'Deprecated' become a permanent, meaningless label. |
