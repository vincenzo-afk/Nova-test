# Goals

## Purpose

Defines what NOVA must achieve, phase by phase, in concrete and testable
terms. Where `vision.md` states identity, this document states targets.

## Scope

Applies to prioritization decisions across the whole project. A feature
that does not serve one of the goals below, for the phase currently being
built, does not get built in that phase — see
`docs/01-product/feature-priority.md` for the resulting prioritized list.

## Phase 1 goals (Observation + Memory, zero execution)

1. NOVA can answer natural-language questions about the user's own files,
   projects, and recent activity with retrieval grounded in actual observed
   data, not model speculation.
2. Every observed file, application, and window event is captured,
   normalized, and made searchable within the same session it occurred in.
3. The knowledge graph correctly links a project to its files, its recent
   activity, and any notes/decisions recorded about it, using the fixed
   ontology in `docs/04-memory/ontology.md` (Tier 2).
4. Zero write or execution capability exists in this phase — success is
   measured purely on retrieval accuracy and recall, not task completion.

## Phase 2 goals (Narrow whitelisted execution)

1. A fixed, small set of native/CLI/MCP-based tool integrations can
   complete real single-step tasks (open a file, run a specified git
   command, create or search files, summarize a document).
2. Every write action is logged with enough state to be undone.
3. Every action is classified by risk tier before execution, and
   destructive actions require explicit confirmation, with zero exceptions.

## Phase 3 goals (Multi-step planning)

1. NOVA can chain Phase 2's whitelisted tools to complete a multi-step
   goal (e.g., "clean up my Downloads folder using these rules") with
   per-step verification, not just a single end-of-task check.
2. Concurrent or overlapping actions on the same resource are serialized
   through the resource-lock manager with zero silent data loss.

## Phase 4 goals (Scoped GUI/vision control)

1. A short, explicit list of supported applications can be controlled via
   accessibility APIs or, where unavailable, vision-guided input, without
   that capability ever being selected ahead of a safer available method.
2. Any vision-driven action sequence has before/after state capture
   sufficient for manual or automatic rollback.

## Phase 5 goals (Provider-agnostic, multi-device, multi-channel — v5)

Ratified by `docs/15-decisions/adr-0008-v5-architecture-evolution.md`,
replacing the earlier "Phase 5 deferred" stub entry with concrete,
testable targets:

1. Every capability domain (LLM, vision, STT, TTS, embeddings, OCR,
   reranking, messaging channels, remote control) is served through the
   common Provider interface (`docs/18-providers/provider-interface.md`);
   zero NOVA Core code paths import a provider SDK directly.
2. The Setup Wizard (`docs/19-setup/setup-wizard.md`) can take a user from
   a fresh install to a fully configured Capability Registry, with every
   step individually skippable and every result editable afterward.
3. Voice interaction meets the latency and barge-in requirements in
   `docs/22-voice/voice-assistant.md`: wake-word detection is always
   local, and mid-speech interruption reliably halts output and re-enters
   listening state.
4. A conversation or task started on one paired device is visible and
   continuable on another within the sync latency budget defined in
   `docs/20-devices/cross-device-memory.md`.
5. At least Telegram, Discord, and WhatsApp are reachable as Channel
   Adapters (`docs/21-channels/messaging-platforms.md`) with zero
   platform-specific logic in the Planner.
6. NOVA can detect a missing capability during planning, propose an
   installable plugin/MCP server/application, and — only on explicit
   confirmation — install and register it for future use
   (`docs/23-autonomy/self-growing-capability.md`).
7. Every new irreversible-action surface (email send, outbound call,
   software install, remote-control session) enforces the same
   no-exceptions confirmation gate as v1's destructive-action rule.

## Cross-cutting goals (apply to every phase)

1. **Deterministic Before Intelligent** is measurable: for a sampled set of
   tasks, the proportion resolved without any LLM call must be trackable
   and must not decrease as new tool integrations are added.
2. Every autonomous action, in every phase, is captured in the audit trail
   described in `docs/10-security/audit.md` (Tier 3) — this is not a later
   enhancement, it exists from Phase 2 onward.
3. No phase begins implementation before the phase before it is verifiably
   working — see `ROADMAP.md`.

## Non-goals

See `non-goals.md`. Goals listed here are deliberately bounded to what is
in scope for the current phase; anything not listed here is either future
work (`ROADMAP.md` Phase 5) or explicitly excluded (`non-goals.md`).

## Related documents

- `vision.md` — the identity these goals serve
- `non-goals.md` — the explicit exclusions
- `docs/01-product/success-metrics.md` — how "goal achieved" is measured
  precisely, including the Task Success Score definition
- `docs/01-product/feature-priority.md` — the resulting prioritized feature
  list
