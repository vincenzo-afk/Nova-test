# Disk Full — Edge Case

## Scenario

Detected before a write is attempted where possible (pre-check available space for large writes); if it occurs mid-write, the partial file must not be treated as valid on next read.

## Requirement

Every edge case in this directory must have an explicit test in `12-testing/` — an edge case with no test is an edge case that will regress silently.
