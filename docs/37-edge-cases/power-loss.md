# Power Loss — Edge Case

## Scenario

Sudden power loss mid-write must not corrupt the memory store — write-ahead logging / atomic rename required for every persisted write.

## Requirement

Every edge case in this directory must have an explicit test in `12-testing/` — an edge case with no test is an edge case that will regress silently.
