# FM-26: Multi-Device Protocol

## Purpose

Consolidates failure modes specific to `docs/28-multi-device-protocol/`
— cross-device sync, pairing, session continuity/handoff, presence and
capability negotiation, networking/discovery, global state and sync
timing, cross-device permissions and notifications, file transfer and
media streaming, config/secrets/plugin distribution, identity and
workspace, recovery and backup, cross-subsystem lifecycle patterns,
resource arbitration and offline mode, time and version compatibility,
migration, and the remaining operational extras (resource/rate limits,
scheduling, background tasks, cache, telemetry, diagnostics,
installation, upgrade strategy, rollback, disaster recovery).

This file complements, rather than replaces, the general distributed-
systems failure catalog already established in
`FM-10-desktop-android-distributed-sync.md` — that file covers the
failure *classes* (split-brain, race conditions, clock skew); this file
and its 16 source documents cover the specific *protocol surfaces* those
classes show up in once NOVA's actual multi-device architecture
(Primary Runtime / Full Peer / Companion, per `docs/20-devices/multi-device-architecture.md`) is fully specified.

## Consolidated failure index

| ID Range | File | Theme |
|---|---|---|
| `FM-26-001` – `004` | `01-cross-device-sync.md` | Large-transfer reliability, sync-category starvation, removal-race, general FM-10 cross-reference |
| `FM-26-005` – `007` | `02-device-pairing-protocol.md` | Pair-code replay, skipped challenge/response, runtime-mode disagreement |
| `FM-26-008` – `010` | `03-session-continuity-and-handoff.md` | Stale continuation state, capability lost between negotiation and execution, dual-active-device duplicate execution |
| `FM-26-011` – `013` | `04-presence-and-capabilities.md` | Stale presence, shallow capability checks, skipped negotiation for 'obvious' capabilities |
| `FM-26-014` – `016` | `05-networking-and-discovery.md` | Connection flapping, suboptimal relay persistence, discovery-name collision |
| `FM-26-017` – `019` | `06-global-state-and-sync-timing.md` | Wrong trigger-tier assignment, cross-category timing inconsistency, general FM-10 cross-reference |
| `FM-26-020` – `022` | `07-permissions-and-notifications.md` | Stale-presence misrouting, temporary-grant overrun, duplicate notification race |
| `FM-26-023` – `025` | `08-file-transfer-and-media-streaming.md` | Chunk-assembly ordering, over-conservative bitrate adaptation, orphaned partial-transfer files |
| `FM-26-026` – `028` | `09-config-secrets-plugin-distribution.md` | Wrong sync-eligibility judgment, secret leakage into synced config, platform-incompatible plugin availability |
| `FM-26-029` – `030` | `10-identity-and-workspace.md` | Un-released workspace lock after crash, scope creep toward multi-tenancy |
| `FM-26-031` – `033` | `11-recovery-and-backup.md` | Poor peer-promotion choice, offline-device schema mismatch on rejoin, inconsistent snapshot timing |
| `FM-26-034` – `035` | `12-lifecycle-patterns.md` | Ad hoc lifecycle missing a needed state, cross-device lifecycle-state ambiguity |
| `FM-26-036` – `038` | `13-resource-arbitration-and-offline-mode.md` | Cross-device request starvation, queued-vs-failed UI ambiguity, un-synced override preference |
| `FM-26-039` – `040` | `14-time-and-version-compatibility.md` | Device-version matrix drift, logical-clock collision (theoretical) |
| `FM-26-041` – `042` | `15-migration.md` | Long-lagging device migration risk, breaking change shipped without deprecation process |
| `FM-26-043` – `045` | `16-operational-extras.md` | Simultaneous fleet-wide upgrade, missing off-site-backup detection, telemetry-aggregation signal blending |

## The cross-cutting risk

The large majority of entries in this file are instances of one of two
patterns: **(a) a state that's valid on one device becoming stale or
ambiguous by the time it's acted on from another device** (presence,
capability, lifecycle state, sync-eligibility), or **(b) a safety
property that holds for a single device silently not being re-verified
once a second device is involved** (dry-run/staged-rollout discipline,
consent gating, resource arbitration). Any new multi-device feature
must be checked against both patterns explicitly during design review,
since together they account for the majority of this file's index.

## Related documents

- `docs/28-multi-device-protocol/` — every file in this folder
- `docs/25-failure-modes/FM-10-desktop-android-distributed-sync.md` —
  the general failure-class catalog this file's entries instantiate
- `docs/25-failure-modes/INDEX.md` — update to include this file
