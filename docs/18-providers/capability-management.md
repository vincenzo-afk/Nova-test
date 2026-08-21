# Capability Management System

## Purpose

The Capability Registry is the single runtime table of every capability
domain NOVA supports, which providers are currently configured for it,
and which one is active by policy. It is the component the Setup Wizard
writes to, the Model/Provider Router reads from, and the UI's settings
surface displays.

## Scope

Registry data model, lifecycle, and its relationship to the Provider
layer (`provider-interface.md`), Plugin system
(`docs/16-extensibility/plugin-architecture.md`), and MCP server
management (`mcp-server-management.md`). Not the routing algorithm itself
(`provider-routing.md`) or the setup UX (`docs/19-setup/setup-wizard.md`).

## Data model

```json
{
  "capability_id": "stt",
  "domain": "speech-to-text",
  "required": false,
  "providers": [
    { "provider_id": "whisper-local", "enabled": true, "priority": 1 },
    { "provider_id": "sarvam-cloud", "enabled": true, "priority": 2 }
  ],
  "active_policy": "cost-optimized | latency-optimized | privacy-first | manual",
  "manual_override": null
}
```

Every entry in `docs/18-providers/provider-interface.md`'s domain table
has a corresponding `capability_id`. A capability with zero enabled
providers is simply unavailable — NOVA degrades the features that depend
on it gracefully (the UI reports "voice input needs a Speech-to-Text
provider — configure one" rather than failing silently).

## Capability states

- **Unconfigured** — no provider registered; dependent features are
  hidden or show a "configure to enable" prompt, never a raw error.
- **Configured, disabled** — a provider exists but the user turned it
  off (e.g., temporarily disabling cloud STT for a privacy-sensitive
  session).
- **Active** — at least one enabled provider, resolved by
  `provider-routing.md` at call time.
- **Degraded** — the active provider's last `healthCheck()` failed;
  registry automatically demotes to the next enabled provider in
  priority order and surfaces a non-blocking notice.

## Relationship to plugins and MCP servers

A plugin or MCP server may register one or more capability providers as
part of its manifest (see `docs/16-extensibility/plugin-architecture.md` and `mcp-server-management.md`). Installing "the Telegram plugin," for
example, registers a Messaging Channel provider with `provider_id: telegram`. The Capability Registry does not care whether a provider
arrived built-in, via a plugin, or via an MCP server — all three are
registered through the same `Provider` interface and manifest shape.

## Editing after setup

Every field in the data model above is editable from the same settings
surface the Setup Wizard writes to
(`docs/19-setup/configuration-system.md`). There is no first-run-only
configuration path — reopening "Settings → Capabilities" reads and
writes the identical registry.

## Auditing

Every enable/disable/priority change and every automatic
degraded-provider demotion is written to the audit log
(`docs/10-security/audit.md`) with the previous and new state, since
capability changes can affect where user data is sent (e.g., switching a
capability from a local to a cloud provider).

## Related documents

- `docs/25-failure-modes/FM-04-model-router-provider-fallback.md` — failure modes for this subsystem
- `provider-interface.md` — what a registered provider must implement
- `provider-routing.md` — how the active provider is chosen per call
- `docs/19-setup/setup-wizard.md` — first-run population of this registry
- `docs/19-setup/configuration-system.md` — post-setup editing surface
- `docs/10-security/permissions.md` — permission gate for enabling a
  cloud provider that did not previously have data access
