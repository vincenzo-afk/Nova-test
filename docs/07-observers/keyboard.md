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

## Related documents

- `docs/25-failure-modes/FM-10-desktop-android-distributed-sync.md` — failure modes for this subsystem
- `docs/03-runtime/observer.md` — the shared framework this source
  implements
- `mouse.md` — the analogous, similarly-scoped mouse observer
- `docs/00-overview/non-goals.md` — the broader privacy boundary this
  observer's restriction is consistent with
