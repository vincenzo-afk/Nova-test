# Configuration System

## Purpose

Specifies the single persistent configuration store behind both the
Setup Wizard and the ongoing Settings UI, so the two are guaranteed to
stay in sync — there is exactly one configuration model, read and
written by two different UX entry points.

## Scope

Storage format, change propagation, and validation. Individual domain
schemas (capability registry entries, permission tiers, routing
policies) are specified in their own documents and referenced here.

## Storage

Configuration is stored as versioned, schema-validated structured
records local to the device (or synced per
`docs/20-devices/cross-device-memory.md` where the user has opted a
setting into cross-device sync — most are device-local by default, e.g.
hardware-dependent local-model choices). Credentials are never part of
this store directly; every credential-bearing field holds a vault
reference (`docs/18-providers/credential-management.md`).

## Sections

- `capabilities` — the Capability Registry
  (`docs/18-providers/capability-management.md`)
- `devices` — paired device list and their sync scope
  (`docs/20-devices/multi-device-architecture.md`)
- `channels` — connected messaging/email/calendar accounts
  (`docs/21-channels/`)
- `plugins` / `mcp_servers` — installed and pending items
  (`docs/16-extensibility/`, `docs/18-providers/mcp-server-management.md`)
- `routing_policies` — per-capability policy
  (`docs/18-providers/provider-routing.md`)
- `permissions` — per-capability and per-tool permission tier overrides
  (`docs/10-security/permissions.md`)
- `voice` — wake word, always-listening toggle, barge-in sensitivity
  (`docs/22-voice/voice-assistant.md`)
- `personalization` — adaptive-behavior preferences and opt-outs
  (`docs/23-autonomy/adaptive-personalization.md`)

## Configuration record shapes

Capability entries use the registry model from `docs/18-providers/capability-management.md`: each key maps to `{ capability_id, domain, required, providers, active_policy, manual_override }`, and each provider record contains `{ provider_id, enabled, priority }` with an optional `credential: { vault_reference }`. The `capability_id` must match the configuration key, and a manual override must reference an available provider.

The `personalization` section contains a visible `preferences` array. Each record has `{ id, category, value, enabled, source, updated_at }`, where `category` is one of `tool-default`, `provider-default`, `proactive-timing`, `routing-preference`, or `tone`; `source` is `user` or `feedback`; and `value` is structured preference data rather than a hidden model change. These records are inspectable, editable, individually resettable, and resettable as a collection. No model weights or hidden weighting are changed.

The `voice` section is typed as `{ enabled, wake_word, always_listening, barge_in_sensitivity }`. `enabled` and `always_listening` are booleans, `wake_word` is a non-empty phrase, and `barge_in_sensitivity` is either `aggressive` or `conservative`. The wake-word detector remains an on-device local component regardless of other provider-routing policy; the configuration stores user preferences, not a cloud wake-word fallback.

## Change propagation

A write to any section takes effect immediately for new requests; no
restart is required except where a section explicitly documents one (for
example, unloading a large local model to free VRAM before loading a
replacement — `docs/18-providers/local-model-management.md`). In-flight
requests continue under the policy that was active when they started.

## Validation

Every write is schema-validated before commit; an invalid write (e.g., a
routing policy referencing a provider_id that doesn't exist) is rejected
with the specific field-level error rather than partially applied.

## Export and backup

The full configuration (excluding credential values, which remain
vault-only) can be exported as a single file for backup or for
replicating a setup to a new device via the pairing flow in
`docs/20-devices/multi-device-architecture.md`. Import re-validates
against the current schema version and flags any section referencing a
provider or plugin not installed on the target device, rather than
silently dropping it.

## Audit and change propagation

Configuration writes are validated before mutation. A successful section write updates the live store and notifies subscribers for new requests; a rejected write leaves the previous snapshot unchanged. The runtime emits local structured audit events for successful updates, rejected updates, personalization resets, and validated imports. These events contain only the section or operation name, stable error code, schema version, and warning count. Credential values, vault references, preference values, provider prompts, and arbitrary configuration payloads are never included in diagnostics.

The Setup Wizard and the ongoing Settings surface use the same ConfigurationStore instance, and RuntimeApplication supplies its existing structured logger to that store. This keeps setup and post-setup changes on one observable, local-first path without introducing a second configuration model.

## Related documents

- `docs/25-failure-modes/FM-20-deployment-and-evolution.md` — failure modes for this subsystem
- `setup-wizard.md` — the guided first-pass writer of this store
- `docs/18-providers/capability-management.md` — the largest single
  section of this store
- `docs/10-security/audit.md` — every configuration change is logged
