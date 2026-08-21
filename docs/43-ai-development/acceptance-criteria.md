# Acceptance Criteria Standard


## Purpose

The format every NOVA feature's acceptance criteria must follow so
"done" is objectively checkable rather than a judgment call.

## Format

Each criterion is a single Given/When/Then statement referencing a
concrete, observable outcome — not an internal implementation detail.

```
GIVEN <system state, referencing the relevant doc's terminology>
WHEN  <the action under test>
THEN  <the observable outcome, including the specific error/state if it's a failure path>
```

## Required criteria categories for every feature

1. **Happy path** — the documented primary use case succeeds.
2. **Every documented failure mode from `25-failure-modes/` and `45-code-perfection-failure-modes/` relevant to this feature** — each
   gets its own Given/When/Then, not a single "handles errors gracefully"
   line.
3. **Boundary conditions** — empty input, maximum size input, concurrent
   calls, zero/negative/null where the type permits it.
4. **Permission/security** — the action is denied when the actor lacks
   permission, per `docs/10-security/permissions.md`.
5. **Idempotency/retry** — repeating the action produces the same
   end-state, not duplicated side effects, if the action is retryable.
6. **Observability** — the action emits the event(s) documented in
   `docs/35-analytics/events.md` and/or `docs/26-system-reference/07-event-catalog.md`.

## Anti-pattern

"The feature works as expected" is not an acceptance criterion. If a
criterion can't be phrased as Given/When/Then with a concrete, checkable
Then, the feature isn't specified precisely enough to build yet — go back
to the source doc.
