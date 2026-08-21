# Permission Denied (Filesystem/OS) — Edge Case

## Scenario

An OS-level permission denial (unreadable file, unwritable directory,
protected system path) is distinct from a NOVA authorization denial
(`docs/10-security/permissions.md`) — this edge case covers the
former. The Executor and Observer must catch the OS error, classify it
as `PermissionDenied` in the error catalog
(`docs/26-system-reference/06-error-catalog.md`), and surface a specific,
actionable message rather than a generic failure; the operation aborts
for that path only and does not halt the surrounding task.

## Requirement

Every edge case in this directory must have an explicit test in
`12-testing/` — an edge case with no test is an edge case that will
regress silently.
