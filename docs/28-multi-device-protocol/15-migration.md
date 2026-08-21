# Migration (Cross-Device)

## Purpose

Specifies how a schema change (memory, config) propagates across an
entire paired device set without any device ending up unreadable to
another — extending the single-workspace migration rule already stated
in `11-recovery-and-backup.md`'s Migration section with the actual
step-by-step propagation sequence.

## Old config → New config

```
New NOVA version ships with config schema vN+1
      ↓
Primary Runtime (or first device to upgrade) runs `nova upgrade`
      ↓
Config migrated locally on that device (docs/27-cli/02-bootstrap-and-health.md)
      ↓
Migrated config syncs to other devices as an ordinary config-sync event
   (09-config-secrets-plugin-distribution.md)
      ↓
Each other device, on receiving a schema version newer than its own,
   is prompted to run its own `nova upgrade` before the new config
   values take effect locally (never silently applied against
   un-migrated local code)
      ↓
All devices converged on vN+1
```

## Old memory → New memory

Same shape, but higher-stakes given memory's size and the impossibility
of a clean "prompt to upgrade" gate on data the way there is for config
(data flows continuously via ordinary sync, unlike a one-time config
push):

```
Device A (upgraded) writes new-schema memory records
      ↓
Device B (not yet upgraded) receives them via ordinary sync
      ↓
Device B's old-schema code encounters a record it doesn't recognize
      ↓
Per the additive-only rule (14-time-and-version-compatibility.md):
   if the change was additive-only, Device B tolerates the new
   optional fields it doesn't understand and continues operating
      ↓
If the change was NOT additive-only (a genuine breaking schema change):
   Device B refuses to write conflicting old-schema records over the
   new ones (per docs/25-failure-modes/FM-20-014's backward-
   compatibility discipline) and instead surfaces "upgrade required"
   rather than silently corrupting the newer records
```

This is why `docs/26-system-reference/09-version-compatibility-matrix.md` and `docs/25-failure-modes/FM-20-deployment-and-evolution.md` both
insist so strongly on additive-only schema evolution wherever possible —
in a multi-device world, a breaking memory-schema change doesn't just
require *a* migration, it requires *every device* to migrate before
normal multi-writer sync can safely resume, which is a materially harder
operational bar than a single-device migration.

## The one hard rule

**No device with an older schema version is ever allowed to silently
overwrite a record written under a newer schema** — this is enforced the
same way `FM-20-014`'s backward-compatibility test suite is enforced for
single-device migrations, extended to check the specific old-write-vs-
new-record scenario during sync, not just at load time.

## Related documents

- `11-recovery-and-backup.md` — the workspace-level migration-
  completeness rule this document details the propagation sequence for
- `docs/25-failure-modes/FM-20-deployment-and-evolution.md` — the
  underlying single-device migration discipline this extends
- `14-time-and-version-compatibility.md` — the additive-only
  compatibility rule this sequence depends on

## Where This Breaks

Failure modes specific to this protocol area. Cross-referenced from `docs/25-failure-modes/FM-26-multi-device-protocol.md`, which indexes all multi-device failure entries in one place, and from `FM-10-desktop-android-distributed-sync.md` for the general distributed-systems failure classes this protocol area instantiates.

| ID | Failure | Trigger | Detection | Severity | Mitigation | Recovery |
|---|---|---|---|---|---|---|
| **FM-26-041** | A device stuck on an old schema for an extended period accumulates a large backlog of un-migrated writes, making its eventual migration far riskier than a routine one | No forcing function nudges a long-offline or update-averse device to migrate promptly. | Schema-version audit across the device set shows one device significantly behind the others for a sustained period. | Medium | Surface schema-version lag as a visible warning (via presence/status, `04-presence-and-capabilities.md`) once it exceeds a threshold, escalating urgency the longer it persists, rather than treating it as silently fine indefinitely. | Prompt strongly (and eventually block new-record writes from the lagging device, per the hard rule above) until it migrates; treat as a `nova doctor` check failure (`docs/27-cli/02-bootstrap-and-health.md`). |
| **FM-26-042** | A breaking schema change is shipped without going through the deprecation-window process, because a contributor didn't realize the multi-device stakes were higher than a single-device change | Same root cause as `docs/25-failure-modes/FM-20-011` (plugin API changes without a deprecation window), here applied to memory schema specifically. | Post-release, old-schema devices start refusing sync per the hard rule above, surfacing widely rather than being caught pre-release. | High | Require any memory/config schema change PR to explicitly state whether it's additive-only or breaking, checked against the multi-device implications specifically (not just single-device), as part of `docs/14-development/release-checklist.md`. | Ship an emergency compatibility shim if possible (translate old-schema reads/writes at the sync boundary); otherwise this is a `FM-20-014`-class incident requiring the full backward-compatibility incident process. |
