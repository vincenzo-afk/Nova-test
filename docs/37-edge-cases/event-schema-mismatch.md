# Event Schema Mismatch — Edge Case

## Scenario

A subscriber receives an event whose payload doesn't match the schema
version it expects (a publisher upgraded before all subscribers did, or
a plugin registered against a stale cached schema,
`docs/26-system-reference/20-versioning-contracts.md`). The subscriber
validates every event payload against its declared schema version
before processing — a mismatch is never coerced or best-effort-parsed;
it is rejected, logged with both versions, and routed to the
dead-letter path (`docs/26-system-reference/07-event-catalog.md`) rather
than processed with missing or wrong-typed fields silently defaulting.

## Requirement

Every edge case in this directory must have an explicit test in
`12-testing/` — an edge case with no test is an edge case that will
regress silently.
