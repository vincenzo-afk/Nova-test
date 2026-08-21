# Versioning Contracts

## Purpose

States, for every kind of versioned artifact in NOVA, what counts as a
breaking change and what happens when one occurs — per Section 22 of
the master documentation outline. Component-specific versioning already
exists (schemas, plugins, memory, APIs); this document is the
cross-cutting rule set that makes those individual policies consistent
with each other, and the single place to check "is this change
breaking" regardless of which artifact it touches.

## Scope

Schemas, Events, Plugins, APIs, Memory, Config, and Agents/Models. Full
per-artifact detail remains in each artifact's own document; this file
states the shared breaking-change definition and the escalation path
when a breaking change is genuinely needed.

## Shared definition: what counts as breaking

A change is breaking if any existing, correctly-behaving consumer would
behave differently or fail after the change, without itself changing.
Concretely:

- **Breaking:** removing a field, renaming a field, changing a field's
  type, changing an event's delivery semantics, tightening validation
  that previously-valid inputs now fail, changing a default that alters
  existing behavior.
- **Non-breaking:** adding an optional field, adding a new event type, adding
  a new enum value a consumer can safely ignore, loosening validation,
  adding a new optional capability.

This mirrors the additive-only rule already stated for tool schemas
(`docs/06-tools/tool-schema-versioning.md`) and plugin manifests
(`docs/16-extensibility/plugin-versioning.md`) — this document confirms
it is the system-wide default, not a tool-specific exception.

## Per-artifact versioning summary

| Artifact | Version carried in | Breaking-change policy | Canonical document |
|---|---|---|---|
| Schemas (tool I/O, entities) | `schema_version` field | Major version bump; old version supported for one deprecation window | `docs/06-tools/tool-schema-versioning.md` |
| Events | Event envelope `version` | New version published alongside old during a migration window; consumers migrate on their own schedule | `docs/26-system-reference/07-event-catalog.md` |
| Plugins | Manifest `version` + declared NOVA API version range | Plugin declares compatible range; Plugin Host refuses to load outside it | `docs/16-extensibility/plugin-versioning.md` |
| Public/internal APIs | URL/header version or field-level version | Additive within a major version; breaking changes require a new major version path | `docs/08-api/versioning.md` |
| Memory schema | Per-node `version` field | Forward-only migration, old version readable until migrated | `docs/04-memory/memory-versioning.md` |
| Configuration | Config file `schema_version` | Migration on load; unrecognized future version falls back per `corrupted-config.md`'s pattern | `docs/14-development/configuration-schema.md` |
| Agents / Models | Model routing entry version | Router treats a model upgrade as a routable alternative, never an in-place silent swap of behavior | `docs/05-ai/model-routing-matrix.md`, `docs/05-ai/prompt-versioning.md` |

## Compatibility matrix

The full cross-artifact compatibility matrix (which plugin versions work
with which NOVA core versions, etc.) is maintained in
`docs/26-system-reference/09-version-compatibility-matrix.md`; this
document's tables above summarize the policy, that document tracks the
actual current compatibility state.

## When a breaking change is genuinely required

1. Confirm no non-breaking alternative exists (additive field, new enum
   value, feature flag).
2. Record the decision as an ADR (`docs/15-decisions/`), including the
   deprecation window for the old version.
3. Bump the appropriate version per the table above.
4. Update `09-version-compatibility-matrix.md` in the same change.

A breaking change made without an ADR is treated as a process violation
regardless of whether the change itself was justified, per Engineering
Principle 1 (Contracts before code).

## Atomic update checklist (applies to any field/schema/API change, breaking or not)

A change to a field, schema, or API surface is not complete when the
field itself changes — it is complete only when every one of the
following changes in the **same commit/PR**, never as a promised
follow-up:

1. **Every documented consumer** of the changed field/schema/API (found
   via this repository's own cross-reference citations — the same
   citation-accuracy method used throughout this specification's own
   audits) is updated to match, not left silently reading the old shape.
2. **Every test** asserting against the old shape is updated; a test
   still passing against the old field name/type after the change is a
   sign the change didn't actually take effect somewhere, not a sign of
   safety.
3. **Every document describing the field/schema/API** (its own spec,
   `docs/26-system-reference/14-data-models.md`'s entity summary if
   applicable, `docs/08-api/schemas.md` if externally exposed) is
   updated — a code change that ships before its documentation is
   updated is exactly the class of drift this entire specification's
   hardening process was built to eliminate.
4. **`CHANGELOG.md`** records the change, including which consumers were
   updated, per this repository's existing changelog conventions.

A PR that changes a field without all four is incomplete, not
"documentation debt to follow up on later" — per
`docs/00-implementation-governance/definition-of-done.md`, partial
completion is not completion.
