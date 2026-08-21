# Operational Extras

## Purpose

The remaining cross-cutting operational documents the source review
flagged as worth adding, gathered into one file since each is a short,
focused extension of an already-established single-device pattern rather
than warranting its own long-form document.

## Resource limits

Per-device and per-workspace ceilings, extending `docs/26-system-reference/08-configuration-reference.md`'s `limits` section across the
multi-device topology: a Companion device (typically far less powerful
than a Full Peer) gets its own, lower resource ceiling profile, checked
via `04-presence-and-capabilities.md`'s capability advertisement rather
than a single global limit applied uniformly regardless of device class.

## Rate limits

Cross-device request rate limits (e.g. how often Device A can issue
remote-execution requests to Device B) prevent one device from
overwhelming another — particularly relevant for a Companion issuing
frequent capability requests to a Primary Runtime. Uses the same
token-bucket pattern already established for provider rate-limit
handling in `docs/25-failure-modes/FM-11-007`, applied to inter-device
request traffic instead of external API traffic.

## Scheduling

Cross-device task scheduling (which device executes a given step) is
`docs/20-devices/distributed-task-scheduling.md`'s full domain; this
entry exists only to cross-reference it from this folder's index.

## Background tasks

Background/autonomous tasks (`docs/23-autonomy/background-life-assistant.md`) that touch multi-device state must respect this folder's
sync-timing (`06-global-state-and-sync-timing.md`) and resource-
arbitration (`13-resource-arbitration-and-offline-mode.md`) rules exactly
as a foreground user-initiated action would — autonomy is not an
exemption from the consent/arbitration model, consistent with
`docs/25-failure-modes/FM-18`'s general stance on autonomous-action scope.

## Cache strategy

Per-device local cache (`docs/25-failure-modes/FM-14-019` through `023`)
is never treated as synced state — a cache is, by definition, a local
performance optimization over the synced source of truth, and cache
invalidation on one device has no cross-device effect or requirement.

## Telemetry

Multi-device telemetry aggregates per-device metrics (`docs/13-devops/monitoring.md`) under one workspace identity for a unified operational
view, while still tagging every metric with its originating device ID —
never blending device-specific signals (e.g. Companion battery level)
into a workspace-wide average that would obscure which specific device
needs attention.

## Diagnostics

`nova diagnostics` (`docs/27-cli/02-bootstrap-and-health.md`), run on any
one device, includes that device's view of the whole paired set's
presence/health state, not just its own local diagnostics — so a single
`diagnostics.zip` from any device gives a reasonably complete picture of
the multi-device system's health, reducing the need to collect
diagnostics from every device separately during an incident.

## Installation

Installing NOVA on an additional device (`docs/27-cli/03-dev-infrastructure-and-env.md`'s one-line installers) is the entry point
into `02-device-pairing-protocol.md` — installation and pairing are
sequential, not the same step: installing NOVA gives you an unpaired,
standalone instance until pairing is explicitly performed.

## Upgrade strategy

Multi-device upgrade order is deliberate, not simultaneous: upgrade the
Primary Runtime (or, in a Full-Peer-only topology, any one designated
device) first, verify via `nova verify`
(`docs/27-cli/07-hidden-gold-and-ci.md`), then upgrade remaining devices
— never upgrade every device at once, since a failed upgrade on the
first device is far easier to diagnose and roll back in isolation than a
simultaneous fleet-wide failure.

## Rollback

Rolling back a multi-device upgrade follows `15-migration.md`'s hard
rule in reverse: a rolled-back device must not accept sync writes
containing fields it no longer understands from any device that hasn't
also rolled back — practically, this means rollback is coordinated the
same deliberate one-device-at-a-time way as upgrade, not a unilateral
per-device action taken without regard to the rest of the paired set.

## Disaster recovery

The multi-device-specific disaster-recovery scenario beyond
`docs/25-failure-modes/FM-21-catastrophic-failures.md`'s single-device
catalog: **total loss of every paired device simultaneously** (e.g.
household fire, theft of both devices together). Mitigated only by an
off-site/cloud-independent backup existing per `11-recovery-and-backup.md`'s Backup section — this is the specific scenario that makes
"a Full Peer's replica is not a substitute for a real snapshot backup"
(stated in that section) matter most: if every replica is lost together,
only an actual out-of-band snapshot can recover the workspace at all.

## Related documents

- Every file in this folder, extended by the entries above
- `docs/25-failure-modes/FM-11-007`, `FM-14-019`–`023`, `FM-18`,
  `FM-21-catastrophic-failures.md` — the single-device failure catalogs
  each entry above extends
- `docs/27-cli/` — the CLI commands referenced throughout

## Where This Breaks

Failure modes specific to this protocol area. Cross-referenced from `docs/25-failure-modes/FM-26-multi-device-protocol.md`, which indexes all multi-device failure entries in one place, and from `FM-10-desktop-android-distributed-sync.md` for the general distributed-systems failure classes this protocol area instantiates.

| ID | Failure | Trigger | Detection | Severity | Mitigation | Recovery |
|---|---|---|---|---|---|---|
| **FM-26-043** | Fleet-wide simultaneous upgrade is performed anyway (ignoring the one-at-a-time guidance) under time pressure, and every device breaks at once | 'Upgrade strategy' guidance above is advisory, not enforced by tooling. | All devices in a workspace report the same upgrade-failure symptom simultaneously, with no known-good device left to diagnose against. | High | Make `nova upgrade` itself enforce staged rollout by default — require an explicit `--force-simultaneous` flag (logged prominently) to bypass the one-device-first pattern, rather than leaving it purely as documentation guidance. | Roll back the first-attempted device using its pre-upgrade snapshot (`docs/27-cli/02-bootstrap-and-health.md`), verify, then resume staged rollout properly rather than continuing the simultaneous attempt. |
| **FM-26-044** | Off-site backup (the only real mitigation for total-fleet-loss) is never actually configured because it requires an explicit opt-in the user never completed | `docs/13-devops/backup.md`'s snapshot mechanism exists but points nowhere off-device by default, consistent with the 'not a hosted multi-tenant service' non-goal — but this leaves total-fleet-loss genuinely unrecoverable if the user never configured their own off-site target. | `nova doctor` (`docs/27-cli/02-bootstrap-and-health.md`) could check for this but doesn't yet flag 'no off-site backup configured' as a warning. | Medium | Add an explicit `nova doctor` check for off-site-backup configuration, surfaced clearly (not buried), since this is the single highest-consequence gap a user can silently have without realizing it. | This is a pure prevention gap, not something recoverable after the fact — the fix is entirely in closing the detection gap so users configure it before they need it. |
| **FM-26-045** | Telemetry aggregation accidentally blends a device-specific signal into a workspace-wide metric despite the stated rule against it | Implementation bug in the aggregation pipeline, not a design gap. | A workspace-wide health metric masks one specific struggling device (e.g. average battery level looks fine while one Companion is critically low). | Low | Cover this with a specific regression test asserting per-device tags are preserved through the aggregation pipeline, not just documenting the rule. | Fix the aggregation bug; audit dashboards/alerts that may have been silently blind to the specific-device signal during the bug's window. |
