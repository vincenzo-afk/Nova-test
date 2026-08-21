# Workflow Timeout — Edge Case

## Scenario

Every workflow node has a max duration; exceeding it fails that node explicitly rather than blocking the whole workflow indefinitely.

## Requirement

Every edge case in this directory must have an explicit test in `12-testing/` — an edge case with no test is an edge case that will regress silently.
