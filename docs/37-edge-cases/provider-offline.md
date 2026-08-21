# Provider Offline — Edge Case

## Scenario

Full provider outage triggers routing to next in the fallback chain, and if none available, an explicit 'no provider available' state — never a hang.

## Requirement

Every edge case in this directory must have an explicit test in `12-testing/` — an edge case with no test is an edge case that will regress silently.
