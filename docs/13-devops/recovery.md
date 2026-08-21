# Disaster Recovery

## Purpose

Specifies what happens when storage integrity checks fail — at startup,
per `docs/02-architecture/lifecycle.md`'s crash-recovery sequence, or at
any other point corruption is detected — and how restoration from a
backup snapshot (`backup.md`) proceeds.

## Scope

Corruption detection and restoration mechanics. Snapshot creation itself
is `backup.md`.

## Corruption detection

Per `docs/02-architecture/lifecycle.md`, an integrity check runs against
Memory, Knowledge Graph, and structured storage at every startup
following an unclean shutdown, and periodically during normal operation.
A failed check on any storage engine triggers the restoration sequence
below for that engine — corruption in one engine (e.g., the vector
database) does not necessarily require restoring engines that passed
their own integrity check, though the unified-snapshot model in
`backup.md` means a full restore to a single consistent point in time is
always available as the safe fallback if partial restoration risks
introducing cross-engine inconsistency.

## Restoration sequence

1. Affected service(s) are stopped via Runtime Manager
   (`docs/03-runtime/runtime-manager.md`).
2. The most recent valid snapshot (`backup.md`) is restored.
3. Integrity is re-verified against the restored snapshot before
   services are allowed to restart.
4. Any data captured between the snapshot's timestamp and the corruption
   event is lost — this is disclosed to the user directly (via the Tray
   or Desktop UI, `docs/09-ui/tray.md`) rather than silently, including
   the approximate time range affected, so the user understands exactly
   what may be missing rather than discovering gaps unexpectedly later.

## No silent partial recovery

Per the same "no silent degradation" philosophy applied to Task Success
Score (`docs/01-product/success-metrics.md`) and performance benchmarks
(`docs/11-performance/benchmarks.md`), a disaster-recovery event is
always surfaced to the user explicitly — NOVA does not restore from
backup and resume operation without informing the user that a recovery
occurred and what the recovery point was.

## Testing this path

Per `docs/12-testing/e2e-tests.md`, disaster recovery is tested by
deliberately corrupting test storage and confirming the detection,
restoration, and disclosure sequence above behaves exactly as documented
— this path is not left untested simply because it is meant to be rare.

## Related documents

- `docs/25-failure-modes/FM-23-recovery-system-meta-failures.md` — failure modes for this subsystem
- `backup.md` — the snapshots this recovery process restores from
- `docs/02-architecture/lifecycle.md` — the crash-recovery sequence this
  document extends
- `docs/12-testing/e2e-tests.md` — how this path is verified
