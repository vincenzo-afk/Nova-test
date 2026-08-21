# Provider Rate Limit — Edge Case

## Scenario

Respect provider-specified retry-after headers; route to fallback provider rather than busy-retrying the same one.

## Requirement

Every edge case in this directory must have an explicit test in `12-testing/` — an edge case with no test is an edge case that will regress silently.
