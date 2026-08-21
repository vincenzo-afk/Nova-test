# Plugin Loop — Edge Case

## Scenario

A plugin repeatedly calling back into NOVA (e.g. re-triggering its own event) must be caught by a call-depth/rate limit, not left to spin.

## Requirement

Every edge case in this directory must have an explicit test in `12-testing/` — an edge case with no test is an edge case that will regress silently.
