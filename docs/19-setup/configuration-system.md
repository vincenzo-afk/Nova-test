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

## Related documents

- `docs/25-failure-modes/FM-20-deployment-and-evolution.md` — failure modes for this subsystem
- `setup-wizard.md` — the guided first-pass writer of this store
- `docs/18-providers/capability-management.md` — the largest single
  section of this store
- `docs/10-security/audit.md` — every configuration change is logged
