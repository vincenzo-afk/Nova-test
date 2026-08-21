# Corrupted Memory — Edge Case

## Scenario

Checksum/validation on read; corrupted records quarantined (not deleted) and flagged for user review rather than silently dropped.

## Requirement

Every edge case in this directory must have an explicit test in `12-testing/` — an edge case with no test is an edge case that will regress silently.
