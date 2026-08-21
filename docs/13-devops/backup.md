# Backup

## Purpose

Specifies how Memory, Knowledge Graph, settings, and runtime state are
snapshotted, implementing the requirement referenced throughout this
repository that corrupted storage can be restored from a known-good
point.

## Scope

Snapshot mechanics and scheduling. Restoration and disaster recovery
specifically is `recovery.md`.

## Unified snapshot, not per-engine

Per `docs/04-memory/memory-storage.md`, all storage engines (structured
stores, vector database, graph database, blob storage) are snapshotted
together, at the same point in time, rather than independently — this
avoids a restore that leaves, for example, the Knowledge Graph reflecting
a later state than Recent Memory, which would violate the consistency
assumptions `docs/04-memory/knowledge-graph.md`'s write-path validation
depends on.

## Snapshot schedule

Automatic periodic snapshots (on a configurable interval, defaulting to
daily) plus an explicit pre-update snapshot taken immediately before any
version update's schema migration step runs (`updates.md`), specifically
so an update-induced issue can be rolled back to the exact pre-migration
state.

## Snapshot encryption

Snapshots preserve the same encryption-at-rest guarantees as the live
storage they were taken from (`docs/10-security/encryption.md`) — a
snapshot file is never a plaintext export, and restoring it requires the
same OS-user context that produced it.

## Retention of snapshots

A rolling window of recent snapshots is retained (configurable count/
duration), with older snapshots pruned automatically — this is separate
from and does not affect the user-controlled Timeline Memory retention
described in `docs/04-memory/timeline.md`, which governs the live data
itself, not backup copies of it. Deleting a time range from Timeline
Memory (`docs/04-memory/timeline.md`) does not retroactively purge that
data from already-taken snapshots; this trade-off is disclosed to the
user at the point of deletion so the "delete this time range" control's
actual scope is not misunderstood.

## Related documents

- `docs/25-failure-modes/FM-14-files-storage-documents-cache.md` — failure modes for this subsystem
- `docs/04-memory/memory-storage.md` — the storage engines snapshotted
  together
- `recovery.md` — how these snapshots are used to restore from
  corruption
- `updates.md` — the pre-update snapshot trigger
- `docs/38-disaster-recovery/backup.md` — what this snapshot/retention
  model means for deletion propagation (a deleted record's bound on how
  long it can persist in an old backup snapshot)
