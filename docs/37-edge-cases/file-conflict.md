# File Conflict — Edge Case

## Scenario

Two observers or a plugin and an observer writing the same file path concurrently must be serialized or explicitly conflict-flagged, never last-write-silently-wins with no record.

## Requirement

Every edge case in this directory must have an explicit test in `12-testing/` — an edge case with no test is an edge case that will regress silently.
