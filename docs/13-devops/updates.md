# Updates

## Purpose

Specifies how NOVA itself is updated over time without corrupting
in-flight tasks, memory, or the Knowledge Graph schema — extending the
crash-recovery guarantees in `docs/02-architecture/lifecycle.md` to the
planned-update case specifically.

## Scope

Update mechanics for the NOVA service and UI Layer. Knowledge Graph
schema migration specifically is `docs/04-memory/ontology.md`.

## Update sequence

1. An available update is detected and, per user configuration, either
   applied automatically or queued pending user confirmation.
2. Before applying, NOVA performs the graceful shutdown sequence in
   `docs/02-architecture/lifecycle.md` — in-flight tasks are brought to a
   safe pause point, not forcibly terminated mid-step.
3. The update is applied to the installed service and UI Layer binaries.
4. On restart, any schema migrations required by the new version (per
   `docs/04-memory/ontology.md`'s versioning rules, or structured-storage
   migrations per `docs/04-memory/memory-storage.md`) run before Memory
   and Knowledge Graph services report ready, consistent with
   `docs/02-architecture/lifecycle.md`'s dependency-ordered startup.
5. Paused in-flight tasks resume or are re-planned depending on their
   state at pause time, per `docs/03-runtime/task-manager.md`'s
   crash-recovery handling — a planned update follows the same resumption
   logic as unclean-shutdown recovery, since both scenarios need the same
   guarantee that no task silently vanishes.

`UpgradeManager` now supports an optional paired `pauseInFlight` /
`resumeAfterUpgrade` adapter lifecycle. When configured, the manager snapshots
first, pauses in-flight work before the migration chain, updates plugins and
verifies the result, then resumes work only after verification succeeds. If an
upgrade fails after pausing, the pre-update snapshot is restored before the
resume hook is attempted. Providing only one of the two hooks is rejected as a
recovery configuration error.

## Version compatibility

Configuration and stored data must remain readable across a supported
range of prior versions — an update never requires the user to
re-configure providers, permissions, or lose access to existing memory
because of a version jump, consistent with the forward-only, versioned
migration approach in `docs/04-memory/memory-storage.md`.

## Rollback

If an update is found to cause a regression (detected via the monitoring
described in `monitoring.md` or reported by the user), the previous
version can be reinstalled; because schema migrations are forward-only
(`docs/04-memory/ontology.md`), a rollback to a prior software version
while retaining post-migration data is not supported, with no exception — schema migrations are forward-only, per
`docs/04-memory/ontology.md`, so there is no mechanism to selectively
un-apply a migration while keeping data written under it. The only
supported rollback path is restoring from the pre-update backup
(`backup.md`) taken automatically before the migration step above runs,
which necessarily reverts data to its pre-migration state as well.

## Related documents

- `docs/25-failure-modes/FM-20-deployment-and-evolution.md` — failure modes for this subsystem
- `docs/02-architecture/lifecycle.md` — the shutdown/restart sequence
  this update process follows
- `docs/04-memory/ontology.md`, `memory-storage.md` — schema migration
  mechanics
- `backup.md` — the pre-update backup this rollback path depends on
