# Persistence Specification

## Purpose

Consolidates NOVA's persistence model — storage, caching, sync, conflict
resolution, transactions, migration, recovery, backup, and restore — into
one coherent specification, per Section 17 of the master documentation
outline. Each topic has deeper, component-specific treatment elsewhere
(linked throughout); this document is the map that ties them together
and states the cross-cutting rules that apply regardless of which
component's data is being persisted.

## Scope

Applies to every component that persists state beyond a single process
lifetime. In-memory-only, ephemeral state is out of scope (see
`docs/03-runtime/state-manager.md` for the boundary between transient
and durable state).

## Storage

NOVA uses a layered storage model: a durable primary store per
workspace (structured records — Tasks, Plugins, Config), a
graph/vector store for Memory (`docs/04-memory/memory-storage.md`), and
a local blob store for large artifacts (files, screen captures,
attachments). Physical layout is defined in
`docs/13-devops/storage-layout.md`; this document governs behavior, not
directory structure. No component writes to another component's storage
namespace directly — see `constraints.md`.

## Caching

Caches are always a derived, disposable view over a persisted source —
never authoritative. A cache miss or explicit invalidation must always
be resolvable by reconstructing from the owning store; a cache that
cannot be safely dropped and rebuilt is a persistence bug, not a valid
optimization. See `docs/11-performance/caching.md` for eviction policy and `docs/25-failure-modes/` (cache-corruption entries) for corrupted-
cache recovery.

## Sync

Cross-device sync (`docs/28-multi-device-protocol/01-cross-device-sync.md`,
`06-global-state-and-sync-timing.md`) propagates changes between paired
devices under the same workspace. Sync is asynchronous and eventually
consistent by default; components that require strong consistency
(e.g., a single active session lock) opt into stricter coordination
explicitly rather than assuming sync provides it.

## Conflict resolution

Two general strategies apply, chosen per entity type:

- **Last-writer-wins with vector clocks** for entities where a clear
  causal order can be established (most config and preference data).
- **Explicit merge with user or Verifier arbitration** for entities
  where silent resolution could lose meaningful information (Memory
  nodes, Task state) — see `docs/04-memory/memory-conflict-resolution.md` and `docs/37-edge-cases/sync-conflict.md`.

No entity type is permitted to resolve conflicts by silently discarding
one side without logging both versions somewhere recoverable, per the
"no silent failure" engineering principle.

## Transactions

Multi-record mutations that must be atomic (e.g., a Task state
transition that also updates a linked Memory node) are wrapped in a
transaction at the owning store's boundary. Cross-store transactions
(e.g., a mutation spanning the primary store and the graph store) are
not supported directly — such operations use the Saga pattern: each
step is individually idempotent, and a compensating action is defined
for every step, so a partial failure can be rolled forward or backward
without leaving the two stores inconsistent. See
`docs/03-runtime/failure-recovery.md` for how a Saga's partial failure
surfaces to the Failure Matrix.

## Migration

Every persisted schema is versioned (per Section 25, Versioning, of the
master outline; see `docs/04-memory/memory-versioning.md`,
`docs/26-system-reference/09-version-compatibility-matrix.md`). A
migration is always forward-only in production, is written to be
re-runnable without side effects if interrupted partway, and never
deletes the pre-migration data until the post-migration state has been
verified. See `docs/38-disaster-recovery/migration.md`.

## Recovery

Recovery from a corrupted or partially-written store follows the
Failure Matrix (`docs/25-failure-modes/`, `docs/36-failure-catalog/`):
rebuild from the last known-good backup plus replay of the durable
event log where available, never a best-effort in-place repair as the
first resort. See `docs/03-runtime/failure-recovery.md` and `docs/38-disaster-recovery/crash-recovery.md`.

## Backup

Backups are taken on a schedule appropriate to the store (frequent,
incremental for the primary store; periodic snapshot for the graph
store) and are verified — a backup that has never been test-restored is
treated as unverified and does not count toward recovery guarantees.
See `docs/13-devops/backup.md` and `docs/38-disaster-recovery/backup.md`.

## Restore

Restore is a two-phase operation: restore to an isolated, non-serving
copy first, verify integrity against the invariants in
`system-invariants.md`, then cut over. A restore is never performed
directly against the live store. See `docs/38-disaster-recovery/restore.md` and `docs/38-disaster-recovery/complete-recovery.md`.

## Cross-cutting rule

Every persistence operation in this document produces an event on the
event bus (`system-invariants.md`: "every mutation produces an event"),
which is what makes sync, audit, and recovery-by-replay possible across
all of the mechanisms above rather than needing a bespoke solution per
store.

## Related documents

- `docs/25-failure-modes/FM-14-files-storage-documents-cache.md` — failure modes for this subsystem
