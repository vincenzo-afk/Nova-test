# Conflicting Instructions — Edge Case

## Scenario

The current task's instructions conflict with a stored Memory entry, a
prior instruction in the same conversation, or another document the
Planner has read (e.g., user says "always use tabs" while a project's
`docs/14-development/coding-standards.md`-equivalent config says
spaces). The Planner does not silently pick one; it treats this as an
ambiguity requiring escalation per
`docs/05-ai/escalation-rules.md`, surfacing both conflicting sources
so the user can resolve it explicitly.

## Requirement

Every edge case in this directory must have an explicit test in
`12-testing/` — an edge case with no test is an edge case that will
regress silently.
