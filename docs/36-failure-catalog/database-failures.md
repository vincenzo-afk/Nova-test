# Database Failures

## Known failure patterns

Migration applied without a rollback path; schema version mismatch between reader and writer during a rolling update; write-ahead log not flushed before reporting write success.

## Cross-reference

See `docs/45-code-perfection-failure-modes/01-memory-and-state.md` for the closest code-level prevention checklist covering this subsystem (that directory is organized by broader cross-cutting concern, not 1:1 by this file's subsystem name), and `docs/25-failure-modes/INDEX.md` for the full narrative failure-mode set.
