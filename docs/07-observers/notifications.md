# Notifications Observer

## Purpose

Observes OS-level and application notification events (e.g., a build
finishing, a message arriving) as a signal source for context — distinct
from NOVA's own notifications *to* the user, which are a UI Layer concern
(`docs/09-ui/`, not this document).

## Scope

Notification-event capture logic. Shared framework behavior is
`docs/03-runtime/observer.md`.

## Captured signals

Notification metadata: source application, timestamp, and title —
default capture level. Notification body content requires a separate,
explicit permission grant beyond metadata, following the same two-level
pattern as the Clipboard Observer (`clipboard.md`), since notification
bodies frequently contain message previews, codes, or other
sensitive content.

## Use cases enabled

Correlating "a long-running build/test notification just fired" with an
in-progress task the user is waiting on, or surfacing "you had a
notification from X while you were focused on project Y" as available
context without requiring the user to have seen or acted on it yet.

## Explicit exclusions

Notifications from applications flagged as sensitive (messaging apps
with end-to-end encryption expectations, authentication/2FA
notification sources) are excluded from body-content capture regardless
of the general permission grant, mirroring the Clipboard Observer's
sensitive-source exclusion (`clipboard.md`) — the same reasoning applies:
protecting against a specific high-consequence failure mode rather than
representing a general privacy preference that could be overridden.

## Relationship to World Model and Memory

Notification events are ingested by the standard indexing pipeline
(`docs/04-memory/indexing.md`) into Recent Memory, tagged with whatever
project/task context was active (via the World Model,
`docs/03-runtime/world-model.md`) at the time the notification arrived —
this is what allows a later query like "did anything happen while I was
away" to be answered from actual observed data.

## Related documents

- `docs/25-failure-modes/FM-10-desktop-android-distributed-sync.md` — failure modes for this subsystem
- `docs/03-runtime/observer.md` — the shared framework this source
  implements
- `clipboard.md` — the analogous two-level permission pattern
- `docs/10-security/permissions.md` — the sensitive-source exclusion
  model
