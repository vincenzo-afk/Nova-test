# Exact-vs-Inferred Target Selection — Edge Case

## Scenario

A user instruction names a target ambiguously enough that NOVA could
either match it exactly (a literal file path, app name, or contact
already known) or infer it (a fuzzy/semantic match against several
candidates — "the budget spreadsheet," "my manager," "that PDF from
yesterday"). The Planner must not silently pick the top-ranked inferred
candidate when an exact match doesn't exist and the inferred candidates
are close in confidence (per
`docs/05-ai/decision-and-confidence-contracts.md`'s tie tolerance) —
this is an `docs/05-ai/escalation-rules.md` trigger (ambiguous
requirement), not a best-guess selection, especially when the action on
the wrong target would be destructive or irreversible
(`docs/03-runtime/planner-executor-contract.md`).

## Requirement

Every edge case in this directory must have an explicit test in
`12-testing/` — an edge case with no test is an edge case that will
regress silently.
