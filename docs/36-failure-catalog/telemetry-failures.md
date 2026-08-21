# Telemetry Failures

## Known failure patterns

Blocking event emission delaying a user-facing response; PII leaked into an event payload; event queue growing unbounded when the sink is unavailable.

## Cross-reference

See `docs/45-code-perfection-failure-modes/11-error-handling-and-logging.md` for the closest code-level prevention checklist covering this subsystem (that directory is organized by broader cross-cutting concern, not 1:1 by this file's subsystem name), and `docs/25-failure-modes/INDEX.md` for the full narrative failure-mode set.
