# Chat Interface

## Purpose

The conversational interaction surface for natural-language questions and
task requests, embedded in the Desktop application and available as a
standalone lightweight window.

## Scope

Chat-specific interaction and display conventions. Shared cross-surface
conventions are `ui-overview.md`; the underlying query mechanics are
`docs/04-memory/search.md` for questions and `docs/03-runtime/planner.md`
for task requests.

## Message types displayed

- User messages (requests or questions).
- Grounded answers, with source attribution back to specific retrieved
  Memory/Knowledge Graph records (`docs/04-memory/search.md`'s grounding
  requirement) shown as inline references, not just prose.
- Task progress messages for in-flight tasks initiated from chat, using
  the same underlying state as `task-monitor.md`.
- Confirmation prompts for actions requiring approval
  (`docs/10-security/permissions.md`), rendered inline in the
  conversation rather than as a disruptive separate dialog, while still
  following the shared visual treatment in `ui-overview.md`.

## Distinguishing questions from task requests

The Planner's deterministic-first and ambiguity-resolution logic
(`docs/05-ai/deterministic-first.md`, `docs/05-ai/ambiguity-resolution.md`)
determines whether a chat message is a read-only question (routed to
Search, `docs/04-memory/search.md`) or a task requiring action — this
distinction is made by the backend, not by the Chat interface itself
inferring intent from message phrasing.

## Mid-conversation correction handling

When a user sends a correction to an in-flight task
(`docs/03-runtime/planner.md`'s dynamic replanning), the Chat interface
displays this as a continuation of the same task thread, not a new,
disconnected message — visually reflecting that the Planner reused
already-completed work rather than starting over.

## Grounding and "not found" display

Per `docs/04-memory/search.md`, when retrieval finds nothing relevant,
Chat displays that directly rather than a synthesized guess — this is a
UI requirement as much as a backend one, since a well-grounded backend
answer can still be undermined by a UI that doesn't clearly distinguish
"answer with sources" from "could not find relevant information."

## Related documents

- `docs/25-failure-modes/FM-22-user-interaction-and-analytics.md` — failure modes for this subsystem
- `ui-overview.md` — shared cross-surface conventions
- `docs/04-memory/search.md` — the grounding requirement this UI must
  surface faithfully
- `task-monitor.md` — the progress data source for in-flight chat tasks
- `docs/05-ai/context-builder.md` — the conversation-history schema this
  interface renders
