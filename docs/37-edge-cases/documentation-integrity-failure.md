# Documentation Integrity Failure — Edge Case

## Scenario

Documentation-lint CI (`docs/26-system-reference/11-documentation-lint-ci.md`)
detects a broken cross-reference, a stale description, or two documents
independently defining the same contract with conflicting content
(`docs/25-failure-modes/FM-24-documentation-and-reference-integrity.md`).
This blocks the merge that introduced or revealed it — it is never
downgraded to a warning that ships anyway. Where an AI agent discovers a
conflict outside of CI (e.g., mid-implementation), it stops and reports
it per `docs/00-implementation-governance/ai-constitution.md`, Rule 7,
rather than picking whichever document it read first.

## Requirement

Every edge case in this directory must have an explicit test in
`12-testing/` — an edge case with no test is an edge case that will
regress silently.
