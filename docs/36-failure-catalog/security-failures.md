# Security Failures

## Known failure patterns

Credential logged in an error message; sandbox resource limits declared but unenforced; permission check bypassed via a non-UI code path (workflow/autonomous trigger).

## Cross-reference

See `docs/45-code-perfection-failure-modes/07-plugin-and-sandboxing.md` for the closest code-level prevention checklist covering this subsystem (that directory is organized by broader cross-cutting concern, not 1:1 by this file's subsystem name), and `docs/25-failure-modes/INDEX.md` for the full narrative failure-mode set.
