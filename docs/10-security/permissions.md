# Permissions

## Purpose

The authoritative policy definition for risk-tiered execution: which risk
tiers require which confirmation level, and the separate, per-source
observation permission model — the policy layer that
`docs/03-runtime/permission-manager.md` enforces mechanically at runtime.

## Scope

Policy definition for both execution risk tiers and observation
permissions. Runtime enforcement mechanics are
`docs/03-runtime/permission-manager.md`; AI-specific gating nuance is
`docs/05-ai/hallucination-prevention.md`.

## Execution risk tiers and confirmation policy

| Risk tier | Definition | Default confirmation requirement |
|---|---|---|
| Read-only | No state change | None — executes immediately |
| Reversible-write | Changes state, but an undo path exists | Configurable; off by default for low-consequence actions, but always logged with undo information |
| Destructive/irreversible | Changes state with no reliable undo path | Mandatory, explicit confirmation — no exceptions, no user-configurable override to disable |

The destructive/irreversible tier's mandatory confirmation cannot be
disabled by user configuration, even for a user who wants maximum
autonomy — this is a deliberate, firm boundary rather than a default that
convenience settings can erode over time.

## Observation permission model

Distinct from execution risk tiers, observation permissions are granted
per source (`docs/07-observers/observer-framework.md`), off by default,
and — for Clipboard and Notifications specifically — at two separate
granularity levels (metadata-only vs. content capture, per
`docs/07-observers/clipboard.md` and `docs/07-observers/notifications.md`).
Filesystem observation is additionally scoped per folder, not
filesystem-wide (`docs/07-observers/filesystem.md`).

## Path containment enforcement

Any component checking a path against a granted folder scope (the
Filesystem Observer above, and any tool/action that reads or writes a
file at a model- or plugin-supplied path) resolves the path to its
canonical, absolute form (resolving `.`, `..`, and symlinks) before
checking containment — never comparing the raw, unresolved string
against the granted folder path. A path containing `../` segments, or a
symlink pointing outside the granted folder, is rejected as
out-of-scope, not silently followed. This is a hard requirement, not an
implementation detail left implicit: a path-scope check performed on an
unresolved string is not a real containment check and must not be
treated as satisfying this permission model.

## The permission center

All permission grants — observation sources, execution confirmation
preferences within the configurable reversible-write tier, and provider/
MCP connection approvals — are managed through one consolidated
permission center UI, reachable from every surface
(`docs/09-ui/ui-overview.md`), not scattered across separate,
hard-to-find settings screens.

## Revocation

Any granted permission can be revoked at any time, taking effect
immediately — a revoked observation source stops capturing immediately
(`docs/07-observers/observer-framework.md`) and a revoked execution
confirmation preference reverts that action category to requiring
confirmation on the very next relevant task, not merely for future
configuration changes.

## Why destructive-tier confirmation has no override

Per this project's foundational review, unconfirmed destructive action —
under any circumstance — was identified as a hard requirement, not a
default. Allowing a configuration override would mean the system's
strongest safety guarantee is only as strong as the least careful user's
settings, which defeats its purpose as a guarantee at all.

## Related documents

- `docs/25-failure-modes/FM-12-security-sandbox-identity.md` — failure modes for this subsystem
- `docs/03-runtime/permission-manager.md` — runtime enforcement of this
  policy
- `docs/05-ai/hallucination-prevention.md` — the AI-specific extension of
  this tiering
- `docs/07-observers/` — the per-source observation permissions
  referenced above
