# Migration Failures

## Known failure patterns

Data migration failing halfway with no resumability; migration not idempotent, corrupting data if re-run after a partial failure.

## Cross-reference

See `docs/45-code-perfection-failure-modes/01-memory-and-state.md` for the closest code-level prevention checklist covering this subsystem (that directory is organized by broader cross-cutting concern, not 1:1 by this file's subsystem name), and `docs/25-failure-modes/INDEX.md` for the full narrative failure-mode set.
