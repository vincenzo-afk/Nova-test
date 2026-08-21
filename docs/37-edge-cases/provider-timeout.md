# Provider Timeout — Edge Case

## Scenario

Distinguish 'no response yet' from 'connection dropped'; a timeout must not be silently retried if the underlying action may have already completed server-side.

## Requirement

Every edge case in this directory must have an explicit test in `12-testing/` — an edge case with no test is an edge case that will regress silently.
