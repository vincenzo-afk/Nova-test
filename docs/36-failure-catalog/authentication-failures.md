# Authentication Failures

## Known failure patterns

Stale session not invalidated on device re-pair; passphrase-derived key mishandled on recovery-phrase regeneration; auth failure retried as if transient.

## Cross-reference

See `docs/45-code-perfection-failure-modes/05-tool-execution-and-permissions.md` for the closest code-level prevention checklist covering this subsystem (that directory is organized by broader cross-cutting concern, not 1:1 by this file's subsystem name), and `docs/25-failure-modes/INDEX.md` for the full narrative failure-mode set.
