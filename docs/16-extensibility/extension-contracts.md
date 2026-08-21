# Extension Contracts (Per-Plugin Template)

## Purpose

`docs/16-extensibility/extension-points.md` states what is customizable,
fixed, and forbidden system-wide. This document is the template every
individual plugin's own contract fills in — per Section 23 of the master
documentation outline, so that "does this plugin need X" has a specific,
checkable answer per plugin rather than only a system-wide policy.

## Scope

The required fields a plugin manifest and its accompanying documentation
must state. Does not restate the system-wide rules in
`extension-points.md`, which every plugin is bound by regardless of what
its own contract says.

## Required per-plugin contract fields

- **Allowed** — the specific capabilities this plugin is permitted to
  use, drawn only from the fixed vocabulary in
  `docs/16-extensibility/plugin-permissions.md` (a plugin cannot invent
  a new capability category).
- **Forbidden** — capabilities explicitly excluded even if technically
  reachable — useful for a plugin author to state intent explicitly
  (e.g., "this plugin never needs network access") so a future version
  requesting it is a visible, reviewable change.
- **Sandbox** — the isolation tier the plugin runs under
  (`docs/16-extensibility/plugin-sandboxing.md`): process-isolated,
  restricted-runtime, or fully sandboxed VM, depending on the
  capabilities requested.
- **Capabilities** — the concrete tool/observer/provider registrations
  this plugin contributes, each conforming to
  `docs/06-tools/tool-interface.md` or the relevant registry contract.
- **Permissions** — the specific, user-facing permission grants required
  (e.g., "read calendar," "send email"), each mapped to a capability
  above — a permission with no corresponding capability, or vice versa,
  is a manifest validation failure
  (`docs/37-edge-cases/invalid-plugin-manifest.md`).
- **Resources** — declared resource needs (memory, disk, network rate)
  used by the Resource Manager to admission-control the plugin under
  `19-ordering-concurrency-and-retry-rules.md`'s limits.
- **Lifecycle** — which lifecycle hooks
  (`docs/16-extensibility/plugin-lifecycle.md`) the plugin implements
  (install, enable, disable, update, uninstall — matching that
  document's actual state names exactly; a plugin manifest using
  different terminology such as "suspend" is a validation failure, not
  a synonym) and what each does.
- **Isolation** — explicit confirmation of what this plugin cannot
  reach: other plugins' state, core internals, and storage outside its
  own namespace (inherited from `extension-points.md`, restated here per
  plugin so it's checked, not assumed).

## Validation

A plugin manifest missing any of the fields above fails validation at
install time, per `docs/37-edge-cases/invalid-plugin-manifest.md` — none
of these fields are optional, even for a minimal plugin; a plugin with
no special resource needs states `resources: default` explicitly rather
than omitting the field.

## Relationship to the system-wide extension points

Every value a plugin declares under "Allowed" must be a subset of
`extension-points.md`'s "Everything customizable" list. A plugin
manifest that requests anything from "Everything forbidden" is rejected
outright, regardless of justification in the manifest's own
documentation — the system-wide list is a hard ceiling this per-plugin
template cannot raise.

## Related documents

- `docs/25-failure-modes/FM-19-plugin-ecosystem.md` — failure modes for this subsystem
