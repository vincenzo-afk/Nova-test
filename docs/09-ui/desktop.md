# Desktop Application

## Purpose

The full-featured primary interface: a standard Windows desktop
application window hosting chat, the Memory Explorer, Graph Explorer,
Task Monitor, and the permission center in one navigable shell.

## Scope

Desktop-app-specific layout and navigation. Shared cross-surface behavior
is `ui-overview.md`; individual embedded panels are documented in their
own pages (`memory-explorer.md`, `graph-explorer.md`, `task-monitor.md`).

## Layout

A persistent navigation structure with: a primary chat/task-request pane,
a collapsible side panel for Task Monitor (showing active and recent
tasks), and dedicated tabs/views for Memory Explorer, Graph Explorer, and
the permission center (`docs/10-security/permissions.md`).

## Relationship to other surfaces

The Desktop application is the only surface that embeds all other
internal views (Memory Explorer, Graph Explorer, Task Monitor, permission
center) directly rather than as separate lightweight tools — Overlay,
Chat (standalone), Command Palette, and Tray each expose a narrower slice
of this same functionality for lower-friction access, per `ui-overview.md`.

## First-run experience

On first launch, the Desktop application presents the permission center
before any chat or task functionality is available, consistent with
`docs/01-product/user-journeys.md` Journey 1 — permission grants are not
buried in a settings menu reachable only after the user has already
started interacting.

## Window and focus behavior

The Desktop application window is tracked by the Windows Observer
(`docs/07-observers/windows.md`) like any other application window — it
does not receive special exemption from observation, and its own state
changes (opened, focused) are visible in the World Model exactly as any
other application's would be, since NOVA does not treat its own UI as a
privileged blind spot in its own state model.

## Related documents

- `docs/25-failure-modes/FM-10-desktop-android-distributed-sync.md` — failure modes for this subsystem
- `ui-overview.md` — shared cross-surface conventions
- `memory-explorer.md`, `graph-explorer.md`, `task-monitor.md` — embedded
  panels
- `docs/10-security/permissions.md` — the permission center shown at
  first run
