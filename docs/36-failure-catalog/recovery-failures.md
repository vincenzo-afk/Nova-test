# Recovery Failures

## Known failure patterns

Recovery process itself failing with no further fallback (meta-failure); automatic recovery silently deleting data instead of quarantining it for inspection.

## Cross-reference

See `docs/45-code-perfection-failure-modes/04-async-and-concurrency.md` for the closest code-level prevention checklist covering this subsystem (that directory is organized by broader cross-cutting concern, not 1:1 by this file's subsystem name), and `docs/25-failure-modes/INDEX.md` for the full narrative failure-mode set.
