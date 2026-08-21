# Sync Failures

## Known failure patterns

Clock-skew-driven incorrect conflict resolution; N-way conflict beyond the tested two-device case; resumable sync losing its checkpoint on crash mid-batch.

## Cross-reference

See `docs/45-code-perfection-failure-modes/08-multi-device-and-sync.md` for the closest code-level prevention checklist covering this subsystem (that directory is organized by broader cross-cutting concern, not 1:1 by this file's subsystem name), and `docs/25-failure-modes/INDEX.md` for the full narrative failure-mode set.
