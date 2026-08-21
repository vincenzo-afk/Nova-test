# Recovery & Backup (Multi-Device)

## Recovery protocol

Example: Desktop (the Primary Runtime) dies. How does Phone continue?

```
Desktop unreachable
      ↓
Phone detects (presence → Offline, 04-presence-and-capabilities.md)
      ↓
Phone checks: is there another Full Peer available?
      ↓
   ┌──────────┴──────────┐
   ▼                      ▼
Yes: another Full Peer   No: no other Full Peer
   ↓                      ↓
Promote it to act as     Phone operates in degraded mode:
temporary Primary         local-replica-only tasks continue,
(distributed-task-        Planner-requiring tasks queue
scheduling.md)             ("waiting to reconnect," per
   ↓                       multi-device-architecture.md's
Phone's queued requests     existing failure-mode note)
resume against it
```

This is a direct extension of `docs/20-devices/multi-device-architecture.md`'s existing "Primary Runtime unreachable" failure mode:
that document already specifies the no-other-peer case (queue and
surface clearly); this document adds the promote-a-peer case, which only
applies in topologies with more than one Full Peer.

## Backup

Multi-device backup is not "back up N devices independently" — it is
"back up the one logical workspace" (per `10-identity-and-workspace.md`),
since every Full Peer holds a full replica already. What still needs
explicit backup:

| Category | Backup approach |
|---|---|
| Memory / Knowledge Graph | Snapshot per `docs/13-devops/backup.md` (Tier 3), taken from whichever device is currently Primary Runtime; a Full Peer's own full replica is itself a form of redundancy but is not a substitute for point-in-time snapshots (a corrupted write replicates to all peers, so replication alone doesn't protect against corruption, only against total device loss) |
| Configuration | Version-controlled/backed-up independently of runtime state, same rule as `docs/25-failure-modes/FM-21-007` |
| Workflow definitions | Backed up alongside configuration, since they're user-authored artifacts, not runtime state |
| Plugins | Plugin *code*/manifests are backed up via the marketplace (re-installable), not via the device backup — only per-plugin *state* (`09-config-secrets-plugin-distribution.md`'s Plugin Runtime ownership) needs device-level backup |
| Conversation history | Included in the Memory/Knowledge Graph snapshot above, not backed up separately |

## Restore

Restoring a workspace (after `FM-21-001`/`006`-class total loss) to a
*new* device follows the same Initial Sync procedure as
`01-cross-device-sync.md` — the restored snapshot becomes the new
device's starting state, and any other surviving paired device
re-syncs against it normally. No special "restore mode" exists distinct
from ordinary sync, keeping the number of distinct code paths (and thus
failure modes) to a minimum.

## Migration

Migrating memory/config schemas across a multi-device set follows the
same migration-chain discipline as `docs/25-failure-modes/FM-20-deployment-and-evolution.md`, with one addition: a schema migration is
only considered complete for the *workspace* once every currently-online
device has applied it — a partially-migrated workspace (some devices on
old schema, some on new) is treated as an active degraded state, not
silently allowed to persist, since it would otherwise violate the sync
model's assumption that all replicas speak the same schema.

## Related documents

- `docs/20-devices/multi-device-architecture.md` — the existing
  Primary-Runtime-unreachable failure mode this extends
- `docs/13-devops/backup.md` — the underlying snapshot mechanism
- `docs/25-failure-modes/FM-21-catastrophic-failures.md` — general
  recovery runbook basis
- `docs/20-devices/distributed-task-scheduling.md` — peer promotion mechanics

## Where This Breaks

Failure modes specific to this protocol area. Cross-referenced from `docs/25-failure-modes/FM-26-multi-device-protocol.md`, which indexes all multi-device failure entries in one place, and from `FM-10-desktop-android-distributed-sync.md` for the general distributed-systems failure classes this protocol area instantiates.

| ID | Failure | Trigger | Detection | Severity | Mitigation | Recovery |
|---|---|---|---|---|---|---|
| **FM-26-031** | Peer promotion selects a Full Peer that's actually less capable/available than another candidate | Promotion logic doesn't account for the candidate's own resource state (e.g. promotes a peer that's itself nearly out of disk space). | Promoted peer immediately struggles with its new load, degrading rather than restoring service. | Medium | Factor in the candidate's own health/resource signals (`docs/25-failure-modes/FM-16-resource-management-and-performance.md`) before promotion, not just 'is it online.' | Demote and try the next-best candidate; surface the resource constraint to the user rather than silently limping along on an overloaded promoted peer. |
| **FM-26-032** | Workspace migration completes for online devices but a long-offline device rejoins with an incompatible old schema | Offline device was excluded from the 'every currently-online device' completion check by definition, then reconnects post-migration. | Rejoining device's sync attempt fails schema validation against the now-newer workspace state. | Medium | On reconnect, a device's schema version is checked before any sync traffic is accepted; a mismatched device is walked through its own local migration first (using the same migration chain, applied locally) before rejoining sync. | Run the missed migration(s) on the reconnecting device before resuming normal sync; never accept old-schema writes into an already-migrated workspace. |
| **FM-26-033** | Backup snapshot is taken from a device mid-way through an unresolved sync conflict, capturing an inconsistent state | Snapshot timing doesn't account for in-progress conflict resolution. | Restore-test (per `docs/25-failure-modes/FM-14-017`) finds the restored state has an unresolved/inconsistent conflict baked in. | Medium | Snapshot only at a point of confirmed consistency (no pending unresolved conflicts), deferring the snapshot briefly if one is in progress, same principle as `docs/25-failure-modes/FM-15-009`'s readiness-vs-liveness distinction applied to backup timing. | Re-run the snapshot once conflicts resolve; if already restored from an inconsistent snapshot, re-apply the conflict-resolution step against the restored state before considering the restore complete. |
