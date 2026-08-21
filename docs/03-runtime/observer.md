# Observer Framework

## Purpose

Describes the shared framework all individual observers (filesystem,
applications, windows, browser, clipboard, notifications, keyboard,
mouse — each detailed in `docs/07-observers/`, Tier 3) are built on:
registration, permission gating, and event normalization. This document
covers what is common to every observer; source-specific detail lives
in Tier 3. The authoritative source list is
`docs/07-observers/observer-framework.md`'s Observer source index — this
list restates it for context and must be corrected here if that table
ever changes; it does not add or remove a source independently.

## Scope

The observer framework contract. Does not cover the implementation detail
of any single observer source.

## Responsibilities

- Register each available observer source with the user-facing permission
  center (`docs/10-security/permissions.md`, Tier 3), off by default.
- Capture raw OS-level events only for sources the user has explicitly
  granted.
- Normalize raw events into the standard event envelope
  (`docs/02-architecture/communication-model.md`) before publishing.
- Apply the debounce/coalesce/batch handling defined in
  `docs/02-architecture/event-driven-architecture.md` before events reach
  the bus.

## Permission gating

No observer captures any data before its specific permission is granted.
Permission is granted per-source and, where meaningful, per-scope (e.g.,
filesystem observation is granted per folder, not filesystem-wide by
default) — see `docs/10-security/permissions.md` for the full model. An
observer whose permission is later revoked stops capturing immediately and
purges any in-flight, not-yet-persisted events for that source.

## Normalization contract

Every observer, regardless of source, must translate its raw OS-level
signal into a normalized event with: an event type from the taxonomy in
`docs/02-architecture/event-driven-architecture.md`, an affected-entity
reference (a path, window handle, or similar), a timestamp, and a
best-effort correlation to any in-flight task that might have caused the
change (e.g., a file modification during an Executor-driven action is
tagged with that task's `correlation_id`, distinguishing it from an
independent user edit).

## Distinguishing NOVA-caused changes from user-caused changes

This distinction matters throughout the system: Memory must not treat a
NOVA-caused file edit as new information about user behavior the same way
it treats a user-initiated edit, and the World Model
(`docs/03-runtime/world-model.md`) needs to know whether a change it just
observed was expected (because the Executor caused it) or not. Observers
achieve this by checking active task `correlation_id`s against the
resource being changed, provided by State Manager, before finalizing an
event's normalization.

## Observer failure isolation

Per Principle 3, each observer source runs in a way that an individual
source failing (e.g., the browser observer losing its connection to the
browser's extension API) does not affect any other observer source or any
other service — a failed observer is retried independently and reports
its degraded status without blocking Memory or Knowledge Graph updates
from other sources.

## Related documents

- `docs/25-failure-modes/FM-15-architecture-runtime-lifecycle-events.md` — failure modes for this component
- `docs/07-observers/` (Tier 3) — individual observer source
  implementations
- `docs/10-security/permissions.md` (Tier 3) — the permission model this
  framework enforces
- `docs/02-architecture/event-driven-architecture.md` — the event
  taxonomy and storm handling this framework relies on
