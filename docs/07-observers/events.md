# Observer Event Taxonomy

## Purpose

The concrete, per-source event type list emitted by the observers in this
folder — the detailed counterpart to the general event categories
introduced in `docs/02-architecture/event-driven-architecture.md`.

## Scope

Event type naming and payload shape per source. General event envelope,
ordering, and storm-handling rules are
`docs/02-architecture/event-driven-architecture.md`.

## Event type reference

| Source | Event types |
|---|---|
| Filesystem | `observer.filesystem.file_created`, `.file_modified`, `.file_deleted`, `.file_moved`, `.file_renamed`, `.bulk_change` |
| Applications | `observer.application.installed`, `.uninstalled`, `.launched`, `.closed`, `.version_changed` |
| Windows | `observer.window.opened`, `.closed`, `.focused`, `.title_changed` |
| Browser | `observer.browser.tab_opened`, `.tab_closed`, `.navigation` |
| Clipboard | `observer.clipboard.changed` (metadata-only or with content, per permission level) |
| Notifications | `observer.notification.received` (metadata-only or with body, per permission level) |
| Keyboard | `observer.keyboard.activity`, `.hotkey_triggered` |
| Mouse | `observer.mouse.activity` |

## Payload conventions

Every event's payload includes the fields common to the standard message
envelope (`docs/02-architecture/communication-model.md`) plus
source-specific fields listed on each source's own page in this folder.
Fields that are permission-gated (e.g., clipboard content, notification
body) are present in the payload only when the corresponding permission
level has been granted — the field is absent, not present-but-null, when
not permitted, so that a consumer cannot distinguish "empty content" from
"content not permitted" in a way that might leak information about
permission state.

## Correlation tagging

Per the convention established in `docs/03-runtime/observer.md`, any
event whose underlying change was caused by an in-flight NOVA task
carries that task's `correlation_id` in its envelope, distinguishing
NOVA-caused changes from independent user activity for every event type
listed above.

## Adding a new event type

A new observer source or event type is added by extending this table and
registering the corresponding topic per
`docs/02-architecture/communication-model.md`'s schema-versioning rules —
existing consumers are unaffected by additive changes, consistent with
the minor-version-compatible handling required there.

## Related documents

- `docs/25-failure-modes/FM-15-architecture-runtime-lifecycle-events.md` — failure modes for this subsystem
- `docs/02-architecture/event-driven-architecture.md` — general event
  model this taxonomy specializes
- `observer-framework.md` — the source index this taxonomy details
- `docs/04-memory/indexing.md` — how these events are ingested
