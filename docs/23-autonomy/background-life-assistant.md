# Background Life Assistant

## Purpose

Specifies NOVA's proactive mode: preparing relevant context — meetings,
email, calendar, research, code, tasks — before the user asks, addressing
the "wake up and NOVA already prepared everything" requirement.

## Scope

Proactive triggering and briefing composition. This document draws on
every channel and analytics capability already specified; it does not
introduce new data access, only a scheduling and synthesis layer over it.

## Trigger model

Proactive behavior runs on the existing Job Scheduler
(`docs/03-runtime/job-scheduler.md`) — a "morning briefing" is a
scheduled job like any other, not a separate always-on process. Triggers
include:

- **Time-based** — a configured daily/weekly briefing time.
- **Event-based** — a new meeting appearing on the calendar within a
  configurable lookahead window, an email from a flagged sender/thread
  arriving, a CI/build failure observed (`docs/07-observers/`).
- **Explicit request** — "get me ready for tomorrow," run on demand.

## Briefing composition

A briefing synthesizes across connected capabilities into a single
digest, each item citing its source rather than blending them
unattributed:

- Upcoming meetings and any prep material referenced in their
  description or linked documents (`calendar-assistant.md`)
- Unread or flagged email needing attention (`email-assistant.md`)
- Overnight research results for any standing research task the user has
  configured
- Code/CI status for tracked repositories (existing observer/tool
  integrations)
- Outstanding tasks and their due dates (`docs/03-runtime/task-manager.md`)

## Delivery

Delivered through whichever surface the user has configured as their
default proactive channel — desktop notification, voice briefing on
wake-word-free "good morning" detection (`docs/22-voice/voice-assistant.md`),
or a message to a configured messaging channel
(`docs/21-channels/messaging-platforms.md`) — never through a surface
the user hasn't set as their briefing destination.

## Boundaries

- **Preparation is not autonomous action.** The background assistant
  drafts and surfaces; it does not send emails, accept meetings, or take
  irreversible actions on the user's behalf during a background run —
  every such action still passes through `docs/10-security/permissions.md`'s
  confirmation gate, surfaced as part of the briefing rather than executed
  silently overnight.
- **Frequency is user-controlled and adapts to feedback** per
  `adaptive-personalization.md`, but can always be fully disabled from
  Settings, reverting to fully on-demand operation.
- **No new data access.** This capability only surfaces what NOVA already
  has permission to read through connected channels and observers; it
  does not expand any permission scope on its own.

## Related documents

- `docs/25-failure-modes/FM-18-autonomy-policy-approval.md` — failure modes for this subsystem
- `docs/03-runtime/job-scheduler.md` — underlying scheduling
- `calendar-assistant.md`, `email-assistant.md` — primary data sources
- `personal-analytics.md`, `adaptive-personalization.md` — feedback loop
  for timing/frequency
- `docs/10-security/permissions.md` — confirmation gate preserved for any
  action surfaced in a briefing
