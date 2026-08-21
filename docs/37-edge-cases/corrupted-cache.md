# Corrupted Cache — Edge Case

## Scenario

Cache corruption is always safe to resolve by cache invalidation and rebuild from source of truth — if it isn't, the cache is being used as a source of truth, which is itself the bug.

## Requirement

Every edge case in this directory must have an explicit test in `12-testing/` — an edge case with no test is an edge case that will regress silently.
