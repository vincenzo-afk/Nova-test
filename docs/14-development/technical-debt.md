# Technical Debt

## Purpose

Defines how technical debt is tracked, categorized, and prioritized
against new feature work, so that debt accumulated under time pressure is
visible and deliberately managed rather than silently accumulating
alongside an ever-expanding feature set — a direct lesson from the
unbounded-scope risk this project's foundational review identified.

## Scope

Debt tracking process. Does not itself define what qualifies as debt for
any specific component — that is judged against the component's own
architecture document and the acceptance criteria in
`docs/12-testing/validation.md`.

## What counts as technical debt here specifically

- A component that passes its module checklist
  (`module-checklist.md`) but with a known, documented gap versus its
  full architecture-document specification (e.g., a tool integration
  registered with `verification_signal: "none"` as a temporary
  measure, correctly restricted to confirmation-required execution per
  the rules, but intended to gain a real verification signal later).
- A test coverage gap explicitly waived for a specific PR with a tracked
  follow-up, rather than silently merged without discussion.
- A performance benchmark result within the regression margin but
  trending toward it, flagged for attention before it becomes an actual
  regression.

## What does not count as technical debt

A deliberate, ADR-ratified scope exclusion (`docs/00-overview/non-goals.md`) is not technical debt — it is a scope decision. Debt
specifically refers to gaps within in-scope work, not features
deliberately deferred to a later phase per `ROADMAP.md`.

## Tracking

Every debt item is recorded with: the component and documentation
section it relates to, the specific gap versus full specification, and a
target phase or milestone (`milestones.md`) by which it must be
resolved — an untracked, undocumented gap discovered later is treated as
a process failure in itself, not merely a technical one.

## Prioritization against new features

Debt items affecting components on the architecture-rules enforcement
list (`architecture-rules.md`) — particularly anything touching
Permission Manager gating, verification signals, or the deterministic-
first check — take priority over new feature work in the same area,
since these are the components where an unresolved gap has the highest
consequence if left unaddressed.

## Related documents

- `module-checklist.md` — where debt items are typically first
  identified during PR review
- `docs/00-overview/non-goals.md` — the distinct category of deliberate
  scope exclusion, not debt
- `milestones.md` — the target points debt resolution is tracked against
