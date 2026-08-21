# Extension Points

## Purpose

States, in one place, everything in NOVA that is customizable by a
plugin or third party, everything that is fixed and cannot be changed by
extension, and everything that is explicitly forbidden even to attempt.
The other documents in `docs/16-extensibility/` describe *how* the
plugin system works mechanically (lifecycle, sandboxing, permissions,
versioning); this document describes *where its boundary sits*, per
Section 21 of the master documentation outline.

## Scope

Applies to the plugin system as a whole. Component-specific extension
points (e.g., a specific provider's configurable routing weight) are
noted here at a summary level and detailed in their owning document.

## Everything customizable

- **Tools.** A plugin may register new tools conforming to the schema in
  `docs/06-tools/tool-interface.md`, discoverable through
  `docs/06-tools/tool-registry.md`.
- **Providers.** New model or service providers may be registered
  through `docs/18-providers/provider-interface.md`, including local
  models (`docs/18-providers/local-model-management.md`).
- **Observers.** New observation sources may be added following the
  contract in `docs/07-observers/observer-framework.md`, so long as they
  respect the permission boundaries in `docs/10-security/permissions.md`.
- **UI panels and screens.** Plugins may register new screens and
  components within the constraints of `docs/09-ui/design-system.md` and `docs/41-components/`.
- **Workflow nodes.** Custom nodes may be added to the workflow engine
  per `docs/17-workflow/workflow-engine.md`.
- **Channels.** New communication channels (beyond email, calendar,
  messaging, phone) may be added following
  `docs/21-channels/` conventions.
- **Configuration values.** Any option explicitly declared in
  `docs/14-development/configuration-schema.md` as plugin-overridable.

## Everything fixed

These exist and can be configured within documented bounds, but their
shape cannot be redefined by extension:

- **The Observe → Remember → Reason → Act → Verify loop.** A plugin
  contributes to a stage; it cannot skip or reorder stages
  (`docs/00-overview/design-principles.md`).
- **The event schema envelope** (`docs/02-architecture/event-bus-specification.md`)
  — a plugin's event payload is extensible; the envelope fields
  (`message_id`, ordering, delivery guarantees) are not.
- **The permission model.** Plugins request from a fixed vocabulary of
  capabilities (`docs/16-extensibility/plugin-permissions.md`); they
  cannot define new capability *categories*, only request existing ones.
- **State ownership.** A plugin can own its own private state but cannot
  become the owner of a core entity type listed in
  `docs/26-system-reference/14-data-models.md`.
- **The Executor as sole execution path.** Fixed by
  `system-invariants.md`; not configurable by any plugin.

## Everything forbidden

- **Direct storage access**, bypassing the owning component's API —
  see `persistence.md` and `constraints.md`.
- **Direct internal-API calls** into core components — plugins interact
  only through granted capabilities.
- **Reading another plugin's sandboxed state or credentials** — see
  `docs/16-extensibility/plugin-sandboxing.md` and `docs/10-security/secrets.md`.
- **Registering a tool, provider, or capability that shadows a core
  system one** without explicit, user-visible override approval — see
  `docs/06-tools/execution-priority.md`.
- **Modifying another plugin's manifest, permissions, or lifecycle
  state.**
- **Escalating its own permissions at runtime** — all permission grants
  are static per install/update cycle; see
  `docs/10-security/permission-escalation.md`.
- **Disabling or bypassing the Verifier stage** for any action it
  triggers.

## Extension request process

A capability that a plugin author needs but that falls outside
"everything customizable" is not something to work around — it is a
signal that either a new fixed extension point should be added (via ADR,
`docs/15-decisions/adr-0007-extensibility.md`) or that the request
belongs in "everything forbidden" for a documented reason. There is
deliberately no informal middle path; see Engineering Principle 1
(Contracts before code) in `engineering-principles.md`.

## Relationship to versioning

Every extension point listed here as customizable has its own
compatibility guarantees under
`docs/16-extensibility/plugin-versioning.md` and `docs/26-system-reference/09-version-compatibility-matrix.md`. Adding a
new extension point is additive and non-breaking; narrowing or removing
one is a breaking change requiring a major version bump and a migration
path (`docs/38-disaster-recovery/migration.md`).

## Related documents

- `docs/25-failure-modes/FM-19-plugin-ecosystem.md` — failure modes for this subsystem
