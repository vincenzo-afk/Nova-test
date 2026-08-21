# Clock Skew — Edge Case

## Scenario

Cross-device ordering uses logical clocks or server-assigned sequence, never raw device-local wall clock comparison.

## Requirement

Every edge case in this directory must have an explicit test in `12-testing/` — an edge case with no test is an edge case that will regress silently.
