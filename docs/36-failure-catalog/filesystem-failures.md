# Filesystem Failures

## Known failure patterns

Sandbox path traversal not blocked; disk-full mid-write leaving a truncated file mistaken for valid; permission denied on an observer's watched path not surfaced to the user.

## Cross-reference

No file in `docs/45-code-perfection-failure-modes/` maps to this subsystem specifically (that directory is organized by broader cross-cutting concern, not by this catalog's per-subsystem breakdown) — see `docs/25-failure-modes/INDEX.md` for the full narrative failure-mode set covering this area instead.
