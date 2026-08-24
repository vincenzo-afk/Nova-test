# Keyboard Observer

## Purpose

Provides activity/idle signal and registered-hotkey detection for NOVA's
own command triggers — explicitly and permanently **not** a keystroke
logger. This restriction is a hard architectural boundary, not a current
limitation awaiting future capability.

## Scope

What this observer captures and, more importantly, the firm boundary on
what it will never capture, regardless of future feature requests.

## What is captured

- **Activity/idle state** — whether keyboard input is occurring at all,
  used by the World Model (`docs/03-runtime/world-model.md`) to infer
  general user engagement (e.g., distinguishing "actively working" from
  "away from keyboard") without recording what is being typed.
- **Registered hotkey triggers** — specific, explicitly configured key
  combinations that invoke a NOVA command (e.g., a command-palette
  shortcut), captured only as "this registered hotkey fired," never as
  general keystroke content.

## What is never captured, under any permission level

Actual keystroke content — what keys are pressed, in what application,
composing what text — is never captured by this observer. There is no
permission level, configuration option, or future roadmap item that
changes this; it is listed in `docs/00-overview/non-goals.md`'s spirit
even though not itemized there explicitly, and is enforced structurally:
this observer's implementation has no code path that reads key content
beyond matching against the small, explicitly registered hotkey set.

## Why this boundary is firm rather than configurable

A general keystroke-logging capability, even gated behind a permission
prompt, would put NOVA in the same technical category as malware
keyloggers from a threat-model perspective, and no stated use case in
`docs/01-product/use-cases.md` requires it — activity detection and
explicit hotkey registration serve every legitimate use case this
observer needs to support.

## Implemented metadata-only surface

The current implementation is `services/observers/src/keyboard-observer.ts` and
uses the off-by-default `keyboard_activity` permission. While disabled, it
cannot start the native bridge or publish activity. Granting the permission
starts the bridge with the host-provided list of explicit hotkey registrations;
revocation stops the bridge immediately and causes subsequent signals to be
rejected. The observer validates every native event, rejects unknown fields and
unregistered hotkey IDs, bounds idle duration to 24 hours, and publishes only
these topics:

| Topic | Payload |
|---|---|
| `observer.keyboard.activity` | `{ state: "active" | "idle", idle_ms: integer }` |
| `observer.keyboard.hotkey_triggered` | `{ hotkey_id: bounded registered identifier }` |

The event envelope carries the normal schema version, source service,
correlation ID, message ID, and timestamp. No key combination, modifier list,
key code, entered text, application text, or raw native message is included in
an emitted event. The hotkey registration itself is passed to the Windows host
only so it can call `RegisterHotKey`; the host emits the configured identifier
when Windows reports `WM_HOTKEY`, never the underlying key content.

The Windows bridge uses `GetLastInputInfo` for activity/idle state and samples
that duration every five seconds, emitting only state transitions. The default
idle threshold is 120 seconds and the runtime injection point permits a bounded
host override. Native bridge startup and registration failures produce a
retryable observer failure and are recorded through Nova's structured logger;
permission denials, malformed signals, accepted events, publication failures,
and revocation are also logged with stable codes and metadata only. On
non-Windows hosts the native bridge refuses to start; this repository therefore
has structural and sandbox evidence but no live Windows validation.

This implementation deliberately does not add raw keyboard input APIs such as
`GetAsyncKeyState`, `GetKeyboardState`, `ToUnicode`, or console key reads. It
must never be extended into a keystroke logger, even behind a new permission.

## Related documents

- `docs/25-failure-modes/FM-10-desktop-android-distributed-sync.md` — failure modes for this subsystem
- `docs/03-runtime/observer.md` — the shared framework this source
  implements
- `mouse.md` — the analogous, similarly-scoped mouse observer
- `docs/00-overview/non-goals.md` — the broader privacy boundary this
  observer's restriction is consistent with
