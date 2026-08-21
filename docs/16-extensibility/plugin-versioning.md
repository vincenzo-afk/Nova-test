# Plugin Versioning

## Purpose

Defines the semantic versioning and compatibility rules for plugins,
following the same discipline already established for the external API
(`docs/08-api/versioning.md`) and applying it to third-party extension
code specifically.

## Scope

Plugin version compatibility rules. Tool-level input/output versioning is
`docs/06-tools/tool-schema-versioning.md`; the update sequence itself is
`plugin-lifecycle.md`.

## Versioning scheme

Semantic versioning (`major.minor.patch`), declared in the plugin
manifest (`plugin-architecture.md`).

## Compatibility rules

- **Patch version change** — bug fixes only; no change to declared tools,
  permissions, or dependencies. Applied automatically if the user has
  enabled automatic plugin updates.
- **Minor version change** — additive only (new optional tools, new
  optional configuration); existing registered tools' input/output
  contracts (`docs/06-tools/tool-schema-versioning.md`) must remain
  compatible. Applied automatically unless the user has disabled
  automatic updates.
- **Major version change** — may include breaking changes to tool
  contracts, permission requirements, or dependencies; never applied
  automatically, always requires explicit user review, mirroring the
  fresh-permission-review requirement in `plugin-permissions.md`.

## Version pinning

A plugin can be pinned to a specific version range in its dependents'
manifests (`plugin-dependencies.md`); the Plugin Manager does not update
a pinned plugin beyond its declared acceptable range even if a newer
version is available, preventing an automatic update from silently
breaking a dependent plugin.

## SDK version and compatibility matrix

Every plugin declares the SDK version range it was built against
(`sdk_version_range`, alongside the manifest fields in
`plugin-architecture.md`), since the SDK itself
(`docs/08-api/sdk.md`) evolves independently of any individual plugin. A
plugin declaring compatibility with SDK major version N is not assumed
compatible with N+1 without explicit testing — the Plugin Manager
maintains a compatibility matrix (SDK version × plugin version) built
from each plugin's declared range, and refuses to enable a plugin against
an SDK version outside its declared range rather than attempting to run
it and discovering incompatibility at runtime.

```json
{
  "plugin_id": "string",
  "version": "semver string",
  "sdk_version_range": "semver range, e.g. '^2.0.0'"
}
```

When NOVA's own SDK version advances to a new major version, previously
enabled plugins outside the new range are flagged (not silently disabled)
so the user can decide whether to keep the prior SDK version active for
compatibility or proceed and disable the incompatible plugins.

## Deprecation

A plugin version can be marked deprecated by its publisher metadata,
surfaced to the user in the plugin management UI (an extension of
`docs/09-ui/ui-overview.md`'s surfaces) — deprecation is informational
and does not force removal, consistent with the non-forced approach in
`docs/08-api/versioning.md`'s API deprecation policy.

## Related documents

- `docs/25-failure-modes/FM-19-plugin-ecosystem.md` — failure modes for this subsystem
- `docs/08-api/versioning.md` — the analogous versioning discipline for
  the external API
- `docs/06-tools/tool-schema-versioning.md` — tool-contract-level
  versioning referenced above
- `plugin-dependencies.md` — where version ranges are declared for
  dependency resolution
