# Plugin Permissions

## Purpose

Specifies how a plugin's declared permission requirements are reviewed,
granted, and enforced — extending `docs/10-security/authorization.md`'s
authorization model to the plugin installation flow specifically.

## Scope

Plugin-specific permission grant and enforcement. General authorization
mechanics are `docs/10-security/authorization.md`.

## Declared permissions at install time

A plugin's package manifest (`plugin-architecture.md`) declares the
permission scopes its tools require, using the same scope vocabulary as
`docs/10-security/authorization.md` — a plugin cannot request or receive
a permission scope outside that existing vocabulary; there is no
plugin-specific permission type that bypasses the established model.

## Install-time review

Before a plugin transitions to `Enabled` (`plugin-lifecycle.md`), its
full declared permission set is presented to the user for explicit
review, granted or denied **individually, scope by scope** — not as a
single "approve all" bundle — mirroring the permission-center pattern in
`docs/10-security/permissions.md`. Denying one requested scope does not
block installation outright: the plugin installs and enables with
whatever subset was actually granted, consistent with "a plugin's
tools... are subject to exactly the granted scope" below — a tool
whose required scope was denied simply fails at invocation time with a
clear permission-denied result, the same as any other authorization
violation, rather than the whole plugin being blocked from installing
over one declined permission among several.

## No privilege beyond declaration

A plugin's tools, once registered, are subject to exactly the granted
scope — a tool attempting an action outside its plugin's approved
permission set is blocked by the Permission Manager
(`docs/03-runtime/permission-manager.md`) exactly as any other
authorization violation would be, per
`docs/10-security/authorization.md`'s "no privilege escalation across
boundaries" rule.

## Permission changes on update

If an updated plugin version (`plugin-lifecycle.md`) declares additional
permission scopes beyond what was previously granted, the update is
treated as requiring fresh review — it does not silently inherit the
prior version's approval for a broader scope than was originally
reviewed.

## Permission negotiation

Where a plugin declares a preferred permission scope but can also
function (with reduced capability) under a narrower one, its manifest
may declare both a `required_permissions` set (functionality is refused
entirely without these) and an `optional_permissions` set (functionality
degrades gracefully without these, per the plugin's own declared
fallback behavior). At install-time review, the user may grant the
required set while declining some or all of the optional set — the
Plugin Manager enables the plugin with only its required tools fully
functional and its optional-permission-dependent tools registered but
restricted per whatever narrower risk tier they can still legitimately
operate under, rather than an all-or-nothing install decision.

## Revocation

Revoking a previously granted plugin permission takes effect immediately,
consistent with `docs/10-security/permissions.md`'s general revocation
behavior — the plugin's affected tools are deregistered or restricted
without requiring the plugin itself to be disabled entirely, where the
plugin registers multiple tools with independently scoped permissions.

## Runtime enforcement contract

The Plugin Manager owns the live grant set for each installed plugin. Enablement invokes an individual review callback once for every declared required and optional scope. A missing review callback is safe by default: every scope is denied, while the plugin may still reach `Enabled` with its restricted capability set. Denying a required scope therefore does not abort installation or process startup; every affected tool invocation is blocked at the execution boundary.

Before a plugin-provided tool is invoked, the manager checks that the plugin is enabled, the tool is listed in `provided_tools`, the requested scope is declared in either `required_permissions` or `optional_permissions`, and that scope is currently granted. A declared-but-revoked scope returns the security authorization code `NOVA-SEC004`; an undeclared tool or scope returns the plugin manifest-mismatch code `NOVA-PLG003`. The check is performed against live in-memory state, so revocation does not wait for process restart or a later task boundary. Disabling a plugin also clears its live grants after deregistering its tools.

Permission review, blocked invocation, and revocation diagnostics are structured and local. They contain only plugin identifier, tool identifier where relevant, permission scope, required/optional status, grant result, and bounded reason metadata; plugin descriptions, code, credentials, arguments, and arbitrary payloads are never logged.

## Related documents

- `docs/25-failure-modes/FM-19-plugin-ecosystem.md` — failure modes for this subsystem
- `docs/10-security/authorization.md`, `permissions.md` — the general
  models this document extends to plugins specifically
- `plugin-lifecycle.md` — the install/update flow this review is part of
- `docs/03-runtime/permission-manager.md` — runtime enforcement
