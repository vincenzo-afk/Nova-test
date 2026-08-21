# Calendar Assistant

## Purpose

Specifies calendar/schedule management as a first-class capability:
reading upcoming events, proposing and creating events, and detecting
conflicts, addressing the requirement that NOVA "manage your schedule."

## Scope

Calendar capability domain. Reminders/alarms tied to non-calendar events
remain in existing runtime scheduling docs
(`docs/03-runtime/job-scheduler.md`); this document covers user-facing
calendar data specifically.

## Provider model

Calendar is a Provider domain with adapters for Google Calendar,
Microsoft 365 Calendar, and generic CalDAV, using OAuth per
`docs/18-providers/credential-management.md`. Multiple calendars (work,
personal, shared) register as distinct sources, queried and written
independently but presented to the user as one merged schedule view.

## Reading

Upcoming events, free/busy status, and recurring-event structure are
available to the Planner for scheduling questions ("am I free Thursday
afternoon") and for the proactive background assistant's daily briefing
(`docs/23-autonomy/background-life-assistant.md`).

## Creating and modifying events

New events, per the existing calendar-drafting behavior already partly
specified in `docs/03-runtime/job-scheduler.md`'s event-creation
primitives, are proposed as a draft (title, time, attendees, location)
before being written. Creating a non-conflicting event on the user's own
calendar with no external attendees is treated as a low-risk, reversible
action (deletable after the fact) and may be pre-authorized for
no-confirmation execution; **adding external attendees or modifying an
event you don't own is always confirmed**, since it has effects outside
NOVA's control once sent.

## Conflict detection

Before creating or accepting an event, NOVA checks for time conflicts
across all connected calendars and surfaces them as part of the
confirmation step rather than silently double-booking or silently
picking a resolution.

## Related documents

- `docs/25-failure-modes/FM-11-internet-and-external-apis.md` — failure modes for this subsystem
- `docs/18-providers/credential-management.md` — OAuth handling
- `docs/03-runtime/job-scheduler.md` — underlying scheduling primitives
- `docs/23-autonomy/background-life-assistant.md` — proactive daily
  briefing use
- `email-assistant.md` — frequently paired account/credential source
