# Corrupted Config — Edge Case

## Scenario

Falls back to last-known-good config with a visible warning, never crashes on an unparsable config file.

## Requirement

Every edge case in this directory must have an explicit test in `12-testing/` — an edge case with no test is an edge case that will regress silently.
