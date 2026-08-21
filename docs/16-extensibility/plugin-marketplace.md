# Plugin Marketplace

## Purpose

Specifies how plugins are discovered and distributed, consistent with
NOVA's fully open source, local-first scope — this is a discovery
mechanism, not a hosted service NOVA operates or depends on.

## Scope

Discovery and distribution. Installation mechanics once a plugin package
is obtained are `plugin-lifecycle.md`.

## Distribution model

Consistent with `docs/00-overview/non-goals.md`'s no-hosted-backend
stance, NOVA itself does not operate a marketplace backend. Plugin
discovery works against a configurable list of plugin index sources —
by default, a community-maintained, openly readable index (e.g., a public
repository listing), with the user able to add additional index sources
or install a plugin directly from a local package file or a direct URL.

## Index entry schema

```json
{
  "plugin_id": "string",
  "latest_version": "semver string",
  "publisher": "string",
  "source_url": "string, where the package itself is fetched from",
  "signature_key": "string, publisher's signing key reference"
}
```

## Trust and signing

Every plugin package is signed by its publisher; the index entry's
`signature_key` is used to verify package integrity before installation
proceeds — an unsigned or signature-mismatched package is rejected,
never installed with a warning-only prompt, since this is a supply-chain
integrity check, not a soft preference.

## No default auto-install

Discovering a plugin through the marketplace index never installs it
automatically — installation always requires the explicit user action
and subsequent permission review described in `plugin-permissions.md`,
regardless of how the plugin was discovered.

## Search and filtering

The marketplace UI (an extension of `docs/09-ui/ui-overview.md`'s
surfaces) supports filtering by declared capability/tool type and by
publisher, cross-referencing the Capability Registry
(`docs/05-ai/capability-registry.md`) where a plugin declares the
capabilities its tools provide, so a user can find a plugin by "what it
lets NOVA do" rather than only by name.

## Related documents

- `docs/25-failure-modes/FM-19-plugin-ecosystem.md` — failure modes for this subsystem
- `plugin-lifecycle.md` — the installation flow following discovery
- `plugin-permissions.md` — the mandatory review after installation
- `docs/05-ai/capability-registry.md` — the capability vocabulary used
  for marketplace search
