# Empty Project — Edge Case

## Scenario

Workspace initialized against a directory with no files, no VCS history,
and no prior memory. Observer, Indexer, and Planner must all treat this
as a valid (if minimal) starting state, not as a corrupt or unready
workspace — onboarding flows in `docs/19-setup/` must complete normally
and the Planner must fall back to asking the user for goals rather than
inferring project type from an empty file tree.

## Requirement

Every edge case in this directory must have an explicit test in
`12-testing/` — an edge case with no test is an edge case that will
regress silently.
