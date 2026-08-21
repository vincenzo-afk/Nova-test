# Memory Full — Edge Case

## Scenario

System RAM exhaustion must trigger graceful shedding (pause non-critical observers, shrink caches) before an OOM kill, per `docs/03-runtime/resource-manager.md`.

## Requirement

Every edge case in this directory must have an explicit test in `12-testing/` — an edge case with no test is an edge case that will regress silently.
