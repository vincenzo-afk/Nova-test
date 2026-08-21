# Plugin Crash — Edge Case

## Scenario

Sandboxed plugin crash must not affect host process; crashed plugin is marked disabled with a visible reason, not silently retried forever.

## Requirement

Every edge case in this directory must have an explicit test in `12-testing/` — an edge case with no test is an edge case that will regress silently.
