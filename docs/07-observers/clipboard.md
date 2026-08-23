# Clipboard Observer

## Purpose

Observes clipboard changes to support use cases like "summarize what I
just copied" or linking copied content to the current project context,
under an explicitly narrower default capture level than most other
observer sources given the sensitivity of clipboard content.

## Scope

Clipboard-specific capture logic and its sensitivity safeguards. Shared
framework behavior is `docs/03-runtime/observer.md`.

## Two-level permission model

Clipboard observation has two distinct, separately grantable permission
levels, not one. Nova uses the following canonical identifiers, both off by
default:

| Permission           | Scope                                                                                                                                                          |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `clipboard_metadata` | Records that a copy occurred and its content type, source application, and byte count; never records clipboard content.                                        |
| `clipboard_content`  | Allows eligible text content to be captured in addition to metadata, but does not replace `clipboard_metadata` and cannot override sensitive-source exclusion. |

The metadata grant is required to start the observer; the content grant is
checked independently for each event and can be revoked without stopping
metadata observation.

1. **Type/metadata only** (default if clipboard observation is enabled
   at all) — records that a copy event occurred and its content type
   (text, image, file reference) without recording the actual content.
2. **Content capture** — records the actual copied content, requiring a
   separate, explicit permission grant beyond level 1.

This split exists because many use cases (e.g., "did I just copy
something relevant to project X") can be served by type/metadata alone,
and defaulting to full content capture would grant far more sensitive
access than most interactions need.

## Event-driven implementation

The Windows implementation uses a hidden Win32 listener registered with
`AddClipboardFormatListener` and handles `WM_CLIPBOARDUPDATE`. It is
started only while `clipboard_metadata` is granted, does not poll with
`Get-Clipboard`, and is stopped immediately when the metadata grant is
revoked. Events are coalesced to the latest pending clipboard state before
publication on `observer.clipboard.changed`.

## Sensitive-source exclusion

Regardless of permission level granted, clipboard content originating
from applications identified as credential managers, password fields, or
other flagged-sensitive sources is excluded from capture entirely — this
exclusion cannot be overridden by the content-capture permission grant,
since it protects against a specific, high-consequence failure mode
(secrets ending up in Memory) rather than a general privacy preference.

## Retention

Clipboard-derived memory follows the same lifecycle as any other Working/
Recent Memory content (`docs/04-memory/memory-lifecycle.md`), but with a
shorter default retention window of 7 days (configurable) before
summarization or expiry — shorter than `memory-lifecycle.md`'s general
30-day default, given that clipboard content is often transient and
task-specific rather than durably significant. Raw events remain pending
only until the observer publishes them; the observer never writes directly
to durable storage. The existing task-bound ObservationIndexer persists only
normalized clipboard metadata, or explicitly content-captured ordinary text,
and strips any content from metadata-only events.

## Correlation with NOVA-driven copy actions

A clipboard change caused by NOVA itself (e.g., an Executor action that
copies a value as part of a task) is tagged with that task's
`correlation_id`, consistent with the general convention in
`docs/03-runtime/observer.md`, so it is not misattributed as an
independent user action.

## Related documents

- `docs/25-failure-modes/FM-10-desktop-android-distributed-sync.md` — failure modes for this subsystem
- `docs/03-runtime/observer.md` — the shared framework this source
  implements
- `docs/10-security/permissions.md` — the two-level permission model in
  full
- `docs/04-memory/memory-lifecycle.md` — retention behavior for
  clipboard-derived memory
