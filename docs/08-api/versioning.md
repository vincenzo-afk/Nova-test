# API Versioning

## Purpose

Defines how the external REST/WebSocket/webhook API surface evolves over
time without breaking existing SDK consumers and integrations.

## Scope

External API versioning policy. Internal message envelope versioning
follows the same semver principle but is described in
`docs/02-architecture/communication-model.md`; internal API versioning
(UI-to-Gateway) is addressed in `internal-api.md` and is exempt from this
policy since both sides deploy together.

## Versioning scheme

Semantic versioning at the API level, exposed via a version path segment
(e.g., `/v1/tasks`) and a corresponding schema version in every
response, per `schemas.md`.

## Compatibility rules

- **Additive changes** (new optional fields, new endpoints, new
  subscribable topics) do not require a version bump and must not break
  existing consumers ignoring unknown fields.
- **Breaking changes** (removing or renaming a field, changing a field's
  type or meaning, removing an endpoint) require a new major version,
  released alongside the previous major version for a defined
  deprecation window rather than an immediate cutover.

## Deprecation process

A deprecated API version is announced with a minimum notice period before
removal, during which requests against the deprecated version include a
deprecation warning header. Removal happens only after the notice period
elapses, never immediately upon announcement.

## SDK version alignment

The public SDK (`sdk.md`) targets a specific API major version and is
updated in step with new major versions being released — an SDK client
built against v1 continues to function against a running v1 API endpoint
indefinitely within that version's support window, consistent with the
compatibility rules above.

## Why this matters for a project with plugin/tool registration

Because the SDK's plugin-tool registration mechanism
(`sdk.md`, `docs/06-tools/tool-registry.md`) is itself an external
integration point, a breaking API change has the potential to silently
disable a previously-registered plugin tool if not handled carefully —
this is specifically why breaking changes require a major version bump
and a deprecation window rather than an in-place change, giving
plugin authors time to update.

## Related documents

- `docs/25-failure-modes/FM-27-external-api-surface.md` — failure modes for this subsystem
- `rest-api.md`, `websocket.md`, `events.md` — the endpoints subject to
  this policy
- `schemas.md` — the schema version field referenced above
- `sdk.md` — the primary consumer this policy protects
