# Windows Observer

## Purpose

Tracks window open/close/focus/title state, the primary feed for the
World Model's "what has focus right now" view, which
`docs/06-tools/automation.md` depends on for pre-action focus validation.

## Scope

Window-lifecycle and focus-tracking capture logic. Shared framework
behavior is `docs/03-runtime/observer.md`.

## Captured signals

Window creation and destruction, title changes, and OS focus transitions
— which window currently has keyboard/mouse focus, tracked continuously
via OS window-event hooks rather than polling, consistent with the
resource-efficiency approach described in
`docs/03-runtime/world-model.md`.

## What is and is not captured about window contents

Only the window's title bar text and its association with a known
application/process is captured — the rendered contents of the window
are not observed by this source at all; that would require either the
target application's own API/accessibility exposure
(`docs/06-tools/accessibility.md`) or Vision
(`docs/06-tools/vision.md`), both of which are separately gated and used
only at execution time for a specific task, not continuously logged as
observation.

## Focus-change latency requirement

Focus-change events must reach the World Model with minimal latency,
since `docs/06-tools/automation.md`'s pre-action validation depends on a
current, not stale, view of what has focus immediately before an input
event is sent — a delay here directly increases the risk window for the
"user switches windows mid-automation" edge case in
`docs/01-product/use-cases.md`.

## Multi-monitor and virtual desktop awareness

Window state includes which monitor and, on Windows, which virtual
desktop a window belongs to, since a window can have "focus" in a
technical sense while not being the one the user is currently looking at
across multiple virtual desktops — this additional context is available
to State Manager (`docs/03-runtime/state-manager.md`) for more accurate
conflict resolution when reasoning about what the user is actually
engaged with.

## Related documents

- `docs/25-failure-modes/FM-10-desktop-android-distributed-sync.md` — failure modes for this subsystem
- `docs/03-runtime/observer.md` — the shared framework this source
  implements
- `docs/03-runtime/world-model.md` — the primary consumer
- `docs/06-tools/automation.md` — the safety-critical consumer of
  focus-change freshness
