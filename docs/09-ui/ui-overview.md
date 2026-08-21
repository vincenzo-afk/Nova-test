# UI Overview

## Purpose

Describes how NOVA's multiple interface surfaces — desktop app, overlay,
chat, command palette, tray, Memory Explorer, Graph Explorer, and Task
Monitor — relate to each other and share one backend, rather than being
independently implemented experiences.

## Scope

Cross-surface structure and shared conventions. Each surface has its own
dedicated document in this folder.

## One backend, many surfaces

Every UI surface communicates through the same Internal API
(`docs/08-api/internal-api.md`) and reflects the same underlying Task
Manager, Memory, and Knowledge Graph state
(`docs/02-architecture/service-architecture.md`) — there is no
surface-specific state that another surface cannot also see. Opening the
Memory Explorer after asking a question in chat shows the same retrieved
records that grounded the chat answer, not a separately maintained view.

## Surface index

| Surface | Primary use | Detail |
|---|---|---|
| Desktop app | Full-featured primary interface | `desktop.md` |
| Overlay | Lightweight, always-accessible quick interaction | `overlay.md` |
| Chat | Conversational Q&A and task requests | `chat.md` |
| Command palette | Fast, keyboard-driven direct commands | `command-palette.md` |
| Tray | Background status and quick access | `tray.md` |
| Memory Explorer | Browsing and searching stored memory | `memory-explorer.md` |
| Graph Explorer | Visualizing Knowledge Graph relationships | `graph-explorer.md` |
| Task Monitor | Live progress for in-flight and recent tasks | `task-monitor.md` |

## Shared design language

All surfaces follow the visual design system in `design-system.md` for
consistency, and all surfaces present risk-tier confirmation prompts
(`docs/10-security/permissions.md`) using the same visual treatment
regardless of which surface a task was initiated from — a destructive
action confirmation looks and behaves identically whether triggered from
chat or the command palette.

## Progress and status consistency

Per `docs/01-product/user-journeys.md`, every surface capable of
initiating a task must be able to show that task's progress using the
Task Monitor's underlying data (`task-monitor.md`), even if a lighter-
weight surface (the overlay) shows a condensed version rather than the
full step-by-step view the Desktop app's Task Monitor panel shows.

## Related documents

- `docs/25-failure-modes/FM-22-user-interaction-and-analytics.md` — failure modes for this subsystem
- `docs/08-api/internal-api.md` — the shared backend interface
- `docs/10-security/permissions.md` — the confirmation UX shared across
  surfaces
- Individual surface documents listed in the table above
