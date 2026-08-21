# Duplicate Events — Edge Case

## Scenario

Idempotency keys on all side-effecting operations; observer-level dedup on identical consecutive events within the canonical 5-second cross-observer conflict window (`docs/26-system-reference/19-ordering-concurrency-and-retry-rules.md`).

## Requirement

Every edge case in this directory must have an explicit test in `12-testing/` — an edge case with no test is an edge case that will regress silently.
