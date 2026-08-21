# Missing Prompt/Template Variable — Edge Case

## Scenario

A prompt or context template expects a variable the caller didn't
supply (`docs/25-failure-modes/FM-06-context-prompt-session.md`,
FM-06-010/011). NOVA schema-validates every template's inputs before
render and fails loudly — it never renders a partially-filled prompt,
never sends a literal `{{...}}`-style placeholder token to a model, and
never silently substitutes an empty string or a guessed default for a
required variable. The caller is fixed to supply the missing value; the
send is blocked until it does.

## Requirement

Every edge case in this directory must have an explicit test in
`12-testing/` — an edge case with no test is an edge case that will
regress silently.
