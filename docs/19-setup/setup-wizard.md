# First-Time Setup Wizard

## Purpose

Specifies the guided flow that configures every capability domain before
NOVA starts operating, per
`docs/15-decisions/adr-0008-v5-architecture-evolution.md`. The wizard's
job is to leave the user with a fully populated Capability Registry
(`docs/18-providers/capability-management.md`), not merely a "getting
started" tour.

## Scope

Wizard steps, sequencing, and skip/defer behavior. The underlying
systems each step configures are specified in their own documents; this
document is the orchestration and UX contract across them.

## Design principles

- **Nothing is mandatory except what NOVA cannot function without.**
  Every step can be deferred with a working, sensible default (typically:
  disabled, or a bundled local provider where one exists) rather than
  blocking progress.
- **Every step's result is editable later** in the identical form via
  `configuration-system.md` — the wizard is a first-pass populator, not a
  one-time gate.
- **Hardware detection runs first** (`docs/18-providers/hardware-detection.md`)
  so every subsequent provider-choice step can pre-filter and recommend
  rather than presenting an undifferentiated list. The shared Capability
  Registry exposes each registered provider's descriptor through its
  recommendation surface; local providers below the advertised
  `minimum_hardware_tier` remain selectable but are labeled
  `available-but-unrecommended` with a performance warning, while providers
  meeting the tier and cloud providers are labeled `recommended`. This is
  advisory and does not silently change the user's selection.

## Steps

Before the provider-choice steps, the Desktop permission center must collect the user's explicit source grants. The first-run inventory is then performed only for the granted sources: hardware detection runs first, and application discovery plus aggregate counts for explicitly approved filesystem scopes run only after the corresponding `applications` and `filesystem` permissions are granted. Inventory is session-scoped for onboarding; raw file names, contents, and unrestricted filesystem state are not persisted as part of this step.

1. **Hardware detection** — scans the current machine; result feeds
   every later provider-choice step.
2. **Core LLM provider** — local model download or cloud API key, per
   `docs/05-ai/model-providers.md`; at least one is required for NOVA to
   reason at all, but the choice between local and cloud is the user's.
3. **Perception providers** — Vision, OCR, Speech-to-Text,
   Text-to-Speech, Embeddings, Reranking — each offered as an optional
   local/cloud choice (`docs/18-providers/provider-interface.md` domain
   table). Skipping any of these simply leaves the dependent feature
   (e.g., voice input) inactive until configured later.
4. **Voice assistant** — if STT+TTS are configured, offers to enable
   always-listening mode and choose a wake word
   (`docs/22-voice/voice-assistant.md`).
5. **Devices** — pair additional devices (Android companion, other
   desktops) via the device-pairing flow
   (`docs/20-devices/multi-device-architecture.md`); optional, can be
   done anytime from Settings.
6. **Channels** — connect messaging platforms (Telegram, Discord,
   WhatsApp, others), email, and calendar
   (`docs/21-channels/`); each is an independent OAuth/token step, all
   skippable individually.
7. **Plugins and MCP servers** — browse the registry, install commonly
   requested ones, or skip entirely and rely on
   `docs/23-autonomy/autonomous-plugin-discovery.md` to propose them
   later on demand.
8. **Routing policy** — choose a default policy (privacy-first,
   latency-optimized, cost-optimized) per capability domain, or accept
   the recommended default (`docs/18-providers/provider-routing.md`);
   editable per-capability later.
9. **Security and permissions** — review default permission tiers
   (`docs/10-security/permissions.md`), confirm the destructive-action
   confirmation policy cannot be disabled, and optionally configure
   remote-control access (`docs/20-devices/remote-control.md`).
10. **Summary** — shows the full resulting Capability Registry state for
    confirmation before NOVA's first run.

## Re-entering the wizard

The full wizard can be re-run from Settings → "Run setup again," which
opens the identical step sequence pre-populated with current values —
useful after a major hardware upgrade or when adding a first channel long
after initial setup. Re-running never silently discards existing
configuration; each step shows current state and requires explicit change.

## Related documents

- `docs/25-failure-modes/FM-20-deployment-and-evolution.md` — failure modes for this subsystem
- `configuration-system.md` — the persistent store every step reads/writes
- `docs/18-providers/capability-management.md` — what the wizard populates
- `docs/20-devices/multi-device-architecture.md`,
  `docs/21-channels/messaging-platforms.md`,
  `docs/22-voice/voice-assistant.md` — domain specifics for steps 5-7
