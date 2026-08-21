# Credential Management

## Purpose

Extends `docs/10-security/secrets.md` (Tier 3) from "provider API keys"
to the full range of credential types v5 requires: API keys, OAuth
tokens (with refresh), device-pairing keys for multi-device sync, and
per-channel bot tokens (Telegram, Discord, WhatsApp Business, etc.).

## Scope

Storage, referencing, rotation, and revocation. This document does not
loosen `secrets.md`'s core rule — it still applies without exception:
**no credential is ever stored inline in a configuration file, plugin
manifest, or memory record.** Every credential lives in the OS-native
vault (Windows Credential Manager, macOS Keychain, Android Keystore —
see `docs/20-devices/multi-device-architecture.md` for the per-platform
mapping) and is referenced everywhere else by an opaque handle.

## Credential types

| Type | Example | Refresh behavior |
|---|---|---|
| Static API key | LLM/vision/STT/TTS vendor key | Manual rotation only |
| OAuth 2.0 token | Google Calendar, Gmail | Automatic refresh via stored refresh token; re-consent prompt on refresh failure |
| Bot/webhook token | Telegram Bot API, Discord bot token | Manual rotation; validated against the platform's API on save |
| Device-pairing key | Cross-device sync, Android companion pairing | Generated locally, exchanged once during pairing (`docs/20-devices/multi-device-architecture.md`), rotated on unpair/re-pair |
| Remote-access credential | Tailscale auth key | Delegated to Tailscale's own credential lifecycle; NOVA stores only the reference needed to invoke it |

## The setup wizard flow

During setup (`docs/19-setup/setup-wizard.md`), any capability requiring
a credential presents the appropriate flow inline — an OAuth consent
popup for Google Calendar, a paste-and-validate field for a bot token —
and on success writes only the vault reference into the Capability
Registry entry. The wizard never displays a previously entered secret
back to the user; it shows "configured" plus a "replace" action.

## Scoping and least privilege

OAuth credentials request the narrowest scope the corresponding
capability needs (e.g., Calendar read/write but not full Google account
access), following the existing least-privilege posture in
`docs/10-security/authorization.md`. Where a provider only offers a
broad scope, the setup wizard discloses this explicitly before consent.

## Revocation

Removing a capability's provider, or explicitly revoking a credential
from Settings, deletes the vault entry and is logged in
`docs/10-security/audit.md`. Revocation is immediate for the local
reference; the wizard also surfaces a one-click link to the provider's
own token-revocation page where NOVA cannot programmatically revoke a
remote OAuth grant itself.

## Related documents

- `docs/25-failure-modes/FM-11-internet-and-external-apis.md` — failure modes for this subsystem
- `docs/10-security/secrets.md` — the Tier 3 rule this document extends
- `cloud-provider-management.md` — where these credentials get used
- `docs/20-devices/multi-device-architecture.md` — device-pairing key
  exchange during multi-device setup
- `docs/21-channels/messaging-platforms.md` — bot token handling per
  channel
