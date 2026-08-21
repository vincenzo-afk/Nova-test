# Configuration Sync, Secrets & Plugin Distribution

## Configuration sync

| Config scope | Syncs across devices? |
|---|---|
| `Global` scope values (per `docs/14-development/configuration.md`) that are hardware-independent | Yes — e.g. `security.destructive_action_confirmation_override`, `ai.cost_budget_daily` |
| `User` scope values that are hardware-independent (preference-like) | Yes — e.g. `plugins.auto_update`, `observers.clipboard.content_capture_enabled` |
| Any value tied to specific hardware (GPU-dependent model settings, local-provider paths) | No — stays device-local, same rule already established in `docs/20-devices/cross-device-memory.md` for device-local configuration |
| Secrets / credentials | No — see Secrets below, a hard exception, never a soft default |

The general rule: a config value syncs if and only if applying the
synced value on a different device would still make sense — this is a
semantic judgment made once per config key at the point it's defined
(part of the schema entry in `docs/14-development/configuration-schema.md`), not inferred generically from scope alone.

## Secrets

**API keys and credentials never sync in plaintext, and are not synced
by default at all.** If a user explicitly wants a provider credential
available on a second device, that is a distinct, explicit per-credential
action (re-entering it, or an explicit encrypted-export/import flow going
through the OS credential vault on both ends) — never an implicit
consequence of ordinary device pairing or config sync. This is a
deliberate, hard-coded exception (mirroring
`docs/26-system-reference/08-configuration-reference.md`'s
`security.destructive_action_confirmation_override` being fixed and
non-configurable) rather than a default a user could accidentally loosen.

Where a credential *is* explicitly shared, it moves through the same
hardware-secure-storage path as its origin device
(`docs/18-providers/credential-management.md`), end-to-end encrypted in
transit, never passing through the sync endpoint in a decryptable form.

## Plugin distribution

Installing a plugin on Desktop does **not** automatically install it on
Phone. Instead:

```
Desktop installs Plugin X
      ↓
Metadata syncs: "Plugin X is installed on Desktop"
      ↓
Phone sees availability, is prompted (not auto-installed):
  "Plugin X is available — install here too?"
      ↓
User decides per-device
```

Rationale: a plugin's resource requirements, permission needs, and even
relevance can differ meaningfully by device class (a filesystem-heavy
plugin has little use on a phone Companion) — per-device opt-in respects
`docs/16-extensibility/plugin-permissions.md`'s consent model rather than
treating installation as a blanket account-wide action. Plugin *version*
updates, once a plugin is independently installed on two devices, follow
each device's own `plugins.auto_update` config independently (which,
per the Configuration sync section above, is itself a synced preference
— but the update action itself still applies per-device based on that
shared preference, not as a single cross-device push).

## Related documents

- `docs/14-development/configuration.md`, `configuration-schema.md` —
  scope/precedence rules this extends
- `docs/18-providers/credential-management.md` — secret storage basis
- `docs/16-extensibility/plugin-permissions.md`, `plugin-versioning.md`
  — the consent and update model this reuses per-device

## Where This Breaks

Failure modes specific to this protocol area. Cross-referenced from `docs/25-failure-modes/FM-26-multi-device-protocol.md`, which indexes all multi-device failure entries in one place, and from `FM-10-desktop-android-distributed-sync.md` for the general distributed-systems failure classes this protocol area instantiates.

| ID | Failure | Trigger | Detection | Severity | Mitigation | Recovery |
|---|---|---|---|---|---|---|
| **FM-26-026** | A config key's sync-eligibility judgment is wrong (marked syncable but is actually hardware-dependent) | Schema author didn't consider a specific key's hardware-dependence when authoring its entry. | A synced value causes a nonsensical/broken configuration on a device with different hardware than the originating device. | Medium | Require explicit sync-eligibility justification as part of every new config key's schema entry (extend `docs/14-development/configuration-schema.md`'s established-key format with a `syncs: true\|false` field and a one-line reason). | Correct the key's sync-eligibility flag; audit devices that received the wrongly-synced value and reset them to their own appropriate local value. |
| **FM-26-027** | A secret is accidentally captured in a config value that does sync (e.g. an API key pasted into a general-purpose text field) | No structural distinction between 'secret-shaped' and 'ordinary' config values at the point of sync, so a misplaced secret rides along with a syncable field. | Secret-scanning pass (same as `docs/25-failure-modes/FM-12-001`) applied to the sync payload itself, not just logs. | Critical | Scan outbound sync payloads for secret-shaped content before transmission, treating any syncable config value as untrusted for this purpose the same way outbound tool-call content is treated in `FM-12-001`. | Treat exactly as `FM-12-001`: rotate the exposed credential, scrub it from sync history/logs, audit exposure window. |
| **FM-26-028** | Plugin appears 'available' on Phone for a plugin that's actually incompatible with Phone's platform | Availability metadata sync doesn't check platform compatibility (`docs/26-system-reference/09-version-compatibility-matrix.md`) before surfacing the install prompt. | User attempts install on Phone and it fails immediately with a compatibility error. | Low | Filter availability prompts by the target device's platform compatibility before surfacing them, not just by 'is it installed somewhere in this identity.' | Suppress the incompatible-platform prompt going forward for that plugin/device-platform combination. |
