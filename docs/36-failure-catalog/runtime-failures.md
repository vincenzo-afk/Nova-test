# Runtime Failures

## Known failure patterns

State Manager fails to reach ready state at boot; Service Lifecycle deadlock between two services awaiting each other; Executor left in a stuck 'in-progress' state after crash with no recovery sweep. See `docs/03-runtime/failure-recovery.md` for recovery contracts.

## Cross-reference

See `docs/45-code-perfection-failure-modes/04-async-and-concurrency.md` for the closest code-level prevention checklist covering this subsystem (that directory is organized by broader cross-cutting concern, not 1:1 by this file's subsystem name), and `docs/25-failure-modes/INDEX.md` for the full narrative failure-mode set.
