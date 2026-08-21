# Desktop Failures

## Known failure patterns

UI state desync after reconnect; optimistic update with no rollback on backend failure; tray/overlay process crash independent of main process.

## Cross-reference

See `docs/45-code-perfection-failure-modes/09-ui-and-state-binding.md` for the closest code-level prevention checklist covering this subsystem (that directory is organized by broader cross-cutting concern, not 1:1 by this file's subsystem name), and `docs/25-failure-modes/INDEX.md` for the full narrative failure-mode set.
