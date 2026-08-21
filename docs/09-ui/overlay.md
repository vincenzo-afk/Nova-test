# Floating Overlay

## Purpose

A lightweight, always-accessible interaction surface for quick requests
without switching focus away from the application the user is currently
working in — the fastest path from "I have a quick question or task" to
an answer.

## Scope

Overlay-specific behavior. Shared cross-surface conventions are
`ui-overview.md`.

## Invocation and dismissal

Summoned via a configurable global hotkey (registered through the
Keyboard Observer's hotkey mechanism, `docs/07-observers/keyboard.md`),
appearing as a small, dismissible panel above the currently focused
application without taking full window focus away from it until the user
actually interacts with the overlay's input field.

## Condensed progress display

For a task initiated from the overlay, progress is shown in a condensed
form — a single current-step label and a completion indicator — rather
than the full step-by-step view the Desktop app's Task Monitor panel
provides (`task-monitor.md`); a user wanting full detail can expand into
the Desktop application view, but the overlay itself stays minimal by
design.

## Confirmation prompts

Risk-tier confirmation prompts (`docs/10-security/permissions.md`)
appearing while the overlay is the active surface use the same visual
treatment specified in `ui-overview.md`, scaled to the overlay's more
compact form factor, but never abbreviated in a way that omits which
specific action is being confirmed.

## Interaction with window/focus observation

Because the overlay briefly takes input focus when the user interacts
with it, the Windows Observer (`docs/07-observers/windows.md`) and World
Model (`docs/03-runtime/world-model.md`) correctly attribute that
transient focus change to the overlay itself, not to the application the
user was in before — this matters specifically so that a GUI-automation
task's pre-action focus validation (`docs/06-tools/automation.md`) is not
confused by the overlay's own appearance and dismissal.

## Related documents

- `docs/25-failure-modes/FM-22-user-interaction-and-analytics.md` — failure modes for this subsystem
- `ui-overview.md` — shared cross-surface conventions
- `docs/07-observers/keyboard.md` — the hotkey invocation mechanism
- `task-monitor.md` — the full-detail view this surface condenses
