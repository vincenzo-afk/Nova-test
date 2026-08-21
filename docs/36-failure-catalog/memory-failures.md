# Memory Failures

## Known failure patterns

Corrupted memory-tier shard; entity-resolution false merge; Knowledge Graph edge duplication under concurrent writes; retrieval returning stale results after a write due to cache invalidation lag.

## Cross-reference

See `docs/45-code-perfection-failure-modes/01-memory-and-state.md` for the closest code-level prevention checklist covering this subsystem (that directory is organized by broader cross-cutting concern, not 1:1 by this file's subsystem name), and `docs/25-failure-modes/INDEX.md` for the full narrative failure-mode set.
