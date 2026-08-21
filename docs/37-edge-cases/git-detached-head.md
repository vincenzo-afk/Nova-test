# Git Detached HEAD — Edge Case

## Scenario

Workspace's Git repository is in a detached-HEAD state (checked-out
commit, not a branch). Any tool that creates commits or branches
(`docs/06-tools/`) must detect this state before acting, refuse to
commit directly onto a detached HEAD, and either prompt the user to
create a branch first or treat the operation as read-only — silently
committing to a detached HEAD is treated as a destructive-irreversible
risk tier (`docs/03-runtime/planner-executor-contract.md`) because the
resulting commit can become unreachable.

## Requirement

Every edge case in this directory must have an explicit test in
`12-testing/` — an edge case with no test is an edge case that will
regress silently.
