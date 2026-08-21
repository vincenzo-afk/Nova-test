# Memory Version Conflict — Edge Case

## Scenario

Two devices sync a Memory node that was independently modified (or
migrated to different schema versions,
`docs/04-memory/memory-versioning.md`) on each side before sync. NOVA
never silently picks one side and discards the other's edit — per
`docs/13-devops/persistence.md`'s conflict-resolution rule for Memory,
this goes through explicit merge with user or Verifier arbitration, and
a version mismatch specifically (not just a content conflict) blocks
auto-merge and forces a migration pass first so both sides are compared
on the same schema version, never comparing v1 and v2 shapes directly.

## Requirement

Every edge case in this directory must have an explicit test in
`12-testing/` — an edge case with no test is an edge case that will
regress silently.
