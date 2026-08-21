# Tray Icon

## Purpose

The minimal, always-present background status indicator and quick-access
entry point, reflecting overall system health and providing fast access
to the other surfaces without requiring the Desktop application to be
open.

## Scope

Tray-specific status display and quick-access menu. Shared cross-surface
conventions are `ui-overview.md`.

## Status indication

The tray icon reflects the Runtime Manager's aggregate health signal
(`docs/03-runtime/runtime-manager.md`): normal operation, a background
task actively running, or a degraded-service state requiring user
attention — using distinct, unambiguous visual states rather than a
single generic "something's wrong" indicator, so the user can tell at a
glance whether action is needed.

## Quick-access menu

Right-click (or equivalent) menu provides: open Desktop application, open
Overlay, pause/resume observation entirely (a global kill-switch distinct
from per-source permission toggles in
`docs/10-security/permissions.md`), and a direct link to the permission
center.

## Global observation pause

The tray's pause-observation control is a fast, highly visible way to
temporarily halt all Observer sources (`docs/03-runtime/observer.md`)
without navigating into detailed per-source settings — this exists
specifically because a user may want a fast, low-friction way to ensure
nothing is being observed (e.g., during a screen-share or sensitive task)
without needing to reason about which specific granular permissions to
toggle.

## Notification of pending confirmations

If a task is awaiting a confirmation the user has not yet responded to
(`docs/10-security/permissions.md`), the tray icon surfaces this
distinctly from ordinary background-task activity, since an unanswered
confirmation blocks that task's progress
(`docs/03-runtime/permission-manager.md`) and the user must be able to
notice it even without the Desktop application open.

## Related documents

- `docs/25-failure-modes/FM-22-user-interaction-and-analytics.md` — failure modes for this subsystem
- `ui-overview.md` — shared cross-surface conventions
- `docs/03-runtime/runtime-manager.md` — the health signal this surface
  displays
- `docs/10-security/permissions.md` — the permission center and pause
  control referenced above
