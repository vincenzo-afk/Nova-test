# Project Scope (v2)

## Purpose

The single authoritative statement of what is in scope for NOVA. Where
other documents describe capabilities or principles, this document is the
one to check when the question is specifically "is this in scope right
now." It consolidates `goals.md`, `non-goals.md`, and `feature-priority.md`
into one boundary statement.

## Revision history

This is the v2 revision, ratified by
`docs/15-decisions/adr-0008-v5-architecture-evolution.md`, which
significantly expanded scope beyond the v1 boundary ratified by
`docs/15-decisions/adr-0001-project-scope.md`. Any further revision still
requires a new ADR, not an informal update — that discipline is unchanged
even though this revision expanded scope substantially.

## In scope (v2)

- **Platform:** Windows (original target), with macOS/Linux full-peer
  support and an Android companion now in scope per
  `docs/20-devices/multi-device-architecture.md`. Each remains a distinct
  engineering effort, scheduled rather than assumed simultaneous.
- **Licensing/cost model:** Fully open source (MIT). No bundled paid
  service. Users provide their own AI provider API keys, run local
  models, or both, per capability, per
  `docs/18-providers/capability-management.md`.
- **Core services:** Everything in v1 (Observer, Memory, Knowledge Graph,
  Planner, Model Router, Tool Registry, Executor, Verifier, API Gateway,
  UI Layer), plus the Capability Registry, Provider layer, Setup Wizard,
  Channel Adapters, and Multi-Agent Coordinator — see
  `docs/00-overview/architecture-summary.md`.
- **Execution:** Unchanged risk-tiered execution-priority chain; GUI/
  vision control remains last-resort and allow-list restricted across
  every vision source (`docs/06-tools/vision-everywhere.md`), not just
  desktop.
- **Personalization:** Retrieval over structured memory and the Knowledge
  Graph, now including adaptive policy-level behavior
  (`docs/23-autonomy/adaptive-personalization.md`). Still no model
  fine-tuning — that boundary is unchanged.
- **Interfaces:** Desktop application, overlay, chat, command palette,
  tray icon, and a public API/SDK — plus voice
  (`docs/22-voice/voice-assistant.md`), an Android companion
  (`docs/20-devices/android-companion.md`), and messaging/email/calendar
  channels (`docs/21-channels/`).
- **Multi-device:** In scope. Memory, task state, and identity
  synchronize across paired devices per
  `docs/20-devices/multi-device-architecture.md` and `docs/20-devices/cross-device-memory.md`.
- **Capability growth:** In scope. NOVA may discover, propose, and
  (with confirmation) install plugins, MCP servers, and third-party
  software at runtime, per `docs/23-autonomy/self-growing-capability.md`.

## Out of scope (see `docs/00-overview/non-goals.md` v2 for full reasoning)

- Any hosted/cloud multi-tenant backend operated by the project itself —
  multi-device sync is user-endpoint-to-user-endpoint, never
  NOVA-operated shared infrastructure.
- Multi-user / shared-workspace access control beyond one workspace per
  identity — multi-*device* is in scope; multi-*user* sharing one
  workspace is not.
- Model fine-tuning or weight adjustment based on user data — unchanged
  from v1, restated in `docs/23-autonomy/adaptive-personalization.md`.
- A fixed, non-versioned, freely-inventable knowledge-graph ontology —
  the ontology remains fixed and versioned; only the capability/plugin
  surface gained runtime extensibility.
- Unconfirmed destructive/irreversible actions, under any circumstance —
  unchanged, and explicitly restated for every new capability domain
  added in this revision (email sends, outbound calls, remote-control
  sessions, software installs).

## Superseded from v1

The following v1 exclusions are repealed by this revision (see
`docs/15-decisions/adr-0008-v5-architecture-evolution.md` for the full
rationale): Windows-only, single-machine-only, "not AI-first" (narrowed,
not repealed — see `docs/00-overview/non-goals.md`), fixed capability set
without runtime growth, and no multi-agent orchestration.

## How scope changes

A capability moves from "deferred" or "out of scope" into "in scope" only
via a new ADR that explicitly amends this document and
`docs/00-overview/non-goals.md` together — never by accretion inside a
feature branch or a documentation edit to an unrelated file.

## Related documents

- `docs/00-overview/goals.md` — concrete, testable targets within this
  scope
- `docs/00-overview/non-goals.md` — full reasoning behind each remaining
  exclusion
- `feature-priority.md` — the prioritized feature list within this scope
- `docs/15-decisions/adr-0001-project-scope.md` — the original v1 ADR
- `docs/15-decisions/adr-0008-v5-architecture-evolution.md` — the ADR
  ratifying this v2 boundary (Tier 3)
