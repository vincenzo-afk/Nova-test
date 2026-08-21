# Mouse Observer

## Purpose

Provides activity/idle signal and on-demand current-position reads for
GUI automation targeting — explicitly not a continuous movement-tracking
or click-history log, for the same threat-model reasons articulated in
`keyboard.md`.

## Scope

What this observer captures and its firm boundaries.

## What is captured

- **Activity/idle state** — whether mouse input is occurring at all,
  feeding the same World Model engagement signal as the Keyboard
  Observer.
- **Current position, read on demand** — queried at the specific moment
  an Executor action in the Vision or Keyboard/Mouse execution tiers
  (`docs/06-tools/vision.md`, `docs/06-tools/automation.md`) needs to
  know current cursor position, not logged continuously.

## What is never captured

A continuous trail of mouse movement or a history of click locations is
not recorded — this observer answers "where is the cursor right now,
this instant" when asked by the Executor, and separately answers
"is there mouse activity happening" for World Model idle-detection, but
never accumulates a movement history a user could not have anticipated
or would find surprising if shown.

## Relationship to Vision and Automation tiers

The position read by this observer at action time is combined with the
target coordinates identified by Vision (`docs/06-tools/vision.md`) to
determine the actual input NOVA sends via
`docs/06-tools/automation.md` — this observer supplies the "where is the
cursor now" half of that calculation; it does not decide where the
cursor should move to.

## Why this boundary is firm rather than configurable

As with the Keyboard Observer, no legitimate use case in
`docs/01-product/use-cases.md` requires a persistent movement/click
history, and maintaining one would meaningfully increase the privacy
surface for no corresponding capability benefit.

## Related documents

- `docs/25-failure-modes/FM-10-desktop-android-distributed-sync.md` — failure modes for this subsystem
- `docs/03-runtime/observer.md` — the shared framework this source
  implements
- `keyboard.md` — the analogous, similarly-scoped keyboard observer
- `docs/06-tools/vision.md`, `docs/06-tools/automation.md` — the
  on-demand consumers of current-position reads
