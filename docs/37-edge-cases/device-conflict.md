# Device Conflict — Edge Case

## Scenario

Two devices attempting the same action (e.g. both approving a workflow gate) resolved by first-writer-wins with the second shown a clear 'already handled' state, not an error.

## Requirement

Every edge case in this directory must have an explicit test in `12-testing/` — an edge case with no test is an edge case that will regress silently.
