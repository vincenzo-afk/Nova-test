# Startup / Deployment Failure — Edge Case

## Scenario

A critical-service failure during boot (`docs/26-system-reference/02-startup-sequence.md`)
or a failed release deployment (`docs/13-devops/deployment.md`,
`docs/14-development/release-checklist.md`) must not leave NOVA in a
half-started, ambiguous state. Startup failure of a critical service
halts boot with a specific, actionable error rather than continuing in
a degraded mode the user didn't ask for; a failed deployment triggers
the documented rollback path
(`docs/14-development/error-handling-tagging-and-performance-rules.md`'s
tagging convention makes the last-good version identifiable) rather than
leaving a partially-applied release running.

## Requirement

Every edge case in this directory must have an explicit test in
`12-testing/` — an edge case with no test is an edge case that will
regress silently.
