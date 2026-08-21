# FM-19: Plugin Ecosystem & Extensibility

## Purpose

Failures in the extensibility layer — everything third-party or user-installed code can break.

## Scope & Related Documents

This file is part of `docs/25-failure-modes/`, the project-wide failure-mode catalog. It must be read alongside:

- `docs/16-extensibility/plugin-architecture.md` - `docs/16-extensibility/plugin-lifecycle.md` - `docs/16-extensibility/plugin-dependencies.md` - `docs/16-extensibility/plugin-versioning.md` - `docs/16-extensibility/plugin-marketplace.md` - `docs/16-extensibility/plugin-permissions.md` - `docs/16-extensibility/plugin-sandboxing.md` - `docs/16-extensibility/extension-points.md` - `docs/16-extensibility/extension-contracts.md`

## Failure Catalog

Each failure is assigned a stable ID (`FM-19-0XX`) for cross-referencing from code comments, incident reports, and other failure-mode files.

| ID | Failure | Trigger Condition | Detection | Severity | Mitigation (prevent) | Recovery (respond) |
|---|---|---|---|---|---|---|
| **FM-19-001** | Malicious plugin | See FM-12-013; included here for the extensibility-lifecycle angle (how it got in, not just what it does once active). | Manifest/behavior audit at review time, or runtime monitoring per FM-12-013. | Critical | Marketplace review process with static + sandboxed dynamic analysis before listing, per `docs/16-extensibility/plugin-marketplace.md`. | See FM-12-013's recovery; also review/tighten the marketplace vetting process that let it through. |
| **FM-19-002** | Plugin crash | Plugin throws an unhandled exception during execution. | Plugin process/sandbox exits unexpectedly or throws past its declared error boundary. | Medium | Isolate plugin execution (separate process/sandbox) so a plugin crash can't take down the host, per `docs/16-extensibility/plugin-sandboxing.md`. | Restart just the plugin's sandbox; surface a clear error to the user rather than a host-level crash. |
| **FM-19-003** | Dependency conflict (plugin) | Two plugins require incompatible versions of a shared dependency. | Dependency-resolution step at plugin-install time detects a version conflict. | Medium | Isolate plugin dependencies per-plugin (no shared global dependency space) where feasible, per `docs/16-extensibility/plugin-dependencies.md`. | Block installation of the conflicting plugin with a clear message, or install in an isolated environment if the architecture supports it. |
| **FM-19-004** | Plugin update breaks API | A plugin update changes its exposed interface in a way that breaks NOVA's integration with it. | Post-update integration smoke test fails for a previously-working plugin interaction. | Medium | Semantic-versioned plugin API contracts (per `docs/16-extensibility/plugin-versioning.md`) with compatibility checks before an update is applied. | Pin to the last compatible version until the integration is updated; notify the plugin author/marketplace of the breaking change. |
| **FM-19-005** | Plugin memory leak | Plugin holds resources longer than its execution scope warrants. | Sandbox memory usage for a specific plugin grows over repeated invocations without returning to baseline. | Medium | Per-plugin resource budgets and periodic sandbox recycling (fresh sandbox instance periodically) rather than one long-lived instance forever. | Recycle the plugin's sandbox; flag the specific plugin for review if the leak recurs after recycling. |
| **FM-19-006** | Plugin abandoned | Plugin author stops maintaining it; it accumulates unpatched vulnerabilities or breaks against newer NOVA versions. | No update activity for the plugin beyond a staleness threshold, cross-referenced against known compatibility/security issues. | Medium | Marketplace staleness flagging and a documented deprecation path for unmaintained plugins, per `docs/16-extensibility/plugin-marketplace.md`. | Flag/deprecate in the marketplace listing; for plugins with known security issues, disable proactively rather than waiting for exploitation. |
| **FM-19-007** | Plugin permission mismatch | Plugin's declared permission manifest doesn't match what it actually attempts to access at runtime. | Runtime access attempt outside the declared manifest scope, caught by the sandbox permission boundary. | High | Enforce the declared manifest as a hard runtime boundary, not just a UI disclosure at install time, per `docs/16-extensibility/plugin-permissions.md`. | Block the out-of-scope access attempt; flag the plugin for review — this pattern strongly correlates with either a bug or malicious intent. |
| **FM-19-008** | Plugin lifecycle mismanagement | Plugin's install/enable/disable/uninstall hooks aren't called in the right order, leaving orphaned state or resources. | Post-uninstall audit finds residual state/files attributable to the plugin. | Low | Well-defined, tested lifecycle hook contract per `docs/16-extensibility/plugin-lifecycle.md`, with cleanup verification on uninstall. | Run a cleanup pass targeting the specific orphaned resources; fix the lifecycle hook that missed them. |

## Compounding Failures

Notes on how failures in this file interact with failures elsewhere in this catalog — read these before assuming a bug is isolated to one subsystem.

- Plugin abandonment (FM-19-006) combined with a hard dependency from a core feature on that plugin is how 'optional extensibility' quietly becomes 'load-bearing and unmaintained' — core features must never have a hard runtime dependency on an unvetted third-party plugin.

## Severity Legend

- **Critical** — data loss, security compromise, or user-visible harm; requires an incident-response runbook, not just a bug ticket.
- **High** — silent incorrectness, significant user-visible breakage, or a failure that blocks task completion with no graceful degradation.
- **Medium** — degraded quality/UX or a failure with a working but imperfect fallback.
- **Low** — cosmetic, rare, or fully recoverable with negligible user impact.
