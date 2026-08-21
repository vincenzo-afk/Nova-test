# Time & Cross-Device Version Compatibility

## Time

Extends `docs/00-overview/time-semantics.md` (already the authoritative
single-device answer to "UTC vs. local, clock drift, ordering") to the
specific concerns that only arise once more than one device's clock is
involved.

| Question | Answer |
|---|---|
| Everything UTC or local? | Everything stored and synced in UTC, same as the base rule; local time is a presentation-layer concern only, per `docs/00-overview/time-semantics.md` and `docs/25-failure-modes/FM-13-015` |
| Clock drift | Assumed and tolerated — devices are never assumed to have perfectly synchronized clocks. Sync checkpoints use a logical clock (a monotonically-increasing per-device counter plus device ID, not a raw timestamp) for ordering, same pattern as `docs/25-failure-modes/FM-10-021`'s mitigation |
| Ordering | Causal ordering via the logical clock above takes precedence over raw timestamp comparison whenever the two would disagree — mirrors `docs/25-failure-modes/FM-10-021`'s general distributed-ordering rule, applied specifically to multi-device sync |
| Timestamp source | `occurred_at` in any synced record (same envelope field as `docs/26-system-reference/07-event-catalog.md`) is set by the originating device at write time and never rewritten by a receiving device, even if that device's clock disagrees — a receiving device's own clock is used only for *its own* new writes, never to "correct" another device's recorded timestamp |

## Version compatibility (devices)

Extends `docs/26-system-reference/09-version-compatibility-matrix.md`
(which covers NOVA-core/plugin-API/config-schema/provider-interface
compatibility generally) to the specific question: can a Desktop on one
NOVA version and a Phone on a different version actually sync?

| Desktop Version | Phone Version | Can sync? | Notes |
|---|---|---|---|
| v5.x | v5.x (same minor) | Yes, full functionality | Standard case |
| v5.x | v5.x (older minor, same major) | Yes, degraded | Phone may lack newer optional fields in synced records; additive-only schema changes (per `docs/26-system-reference/09-version-compatibility-matrix.md`'s config-schema rule, applied here to the sync-record schema) mean this degrades gracefully rather than breaking |
| v5.x | v1.x | No | v1 predates multi-device support entirely (`docs/20-devices/multi-device-architecture.md`); no sync protocol exists on the v1 side to speak to |
| v5.x (major N) | v5.x (major N+1, hypothetical future) | Not guaranteed | Same as the general matrix's rule: a major-version bump is not guaranteed backward-compatible absent an explicit deprecation-window commitment for the sync protocol specifically |

The general principle, consistent with
`docs/26-system-reference/09-version-compatibility-matrix.md`: sync
compatibility follows the same additive-only-within-a-major-version rule
as configuration schema compatibility, because a synced record is,
structurally, just another schema-versioned payload.

## Related documents

- `docs/00-overview/time-semantics.md` — the base single-device time rules
- `docs/26-system-reference/09-version-compatibility-matrix.md` — the
  general compatibility matrix this extends
- `docs/25-failure-modes/FM-10-021` — clock-skew failure mode this
  document's mitigation is drawn from

## Where This Breaks

Failure modes specific to this protocol area. Cross-referenced from `docs/25-failure-modes/FM-26-multi-device-protocol.md`, which indexes all multi-device failure entries in one place, and from `FM-10-desktop-android-distributed-sync.md` for the general distributed-systems failure classes this protocol area instantiates.

| ID | Failure | Trigger | Detection | Severity | Mitigation | Recovery |
|---|---|---|---|---|---|---|
| **FM-26-039** | Device-version compatibility table isn't updated in the same release that changes the sync protocol | Same drift risk as `docs/25-failure-modes/FM-24-025`, specific to the sync-protocol version dimension this document adds beyond the general matrix. | Release checklist gap; caught only when an actual old/new device pairing breaks in the field. | Medium | Extend the release-checklist line item from `FM-24-025` to explicitly include this device-version table, not just the general matrix. | Backfill the table; treat any field-reported incompatibility as equivalent in severity to `FM-24-026` (false compatibility claim). |
| **FM-26-040** | Logical clock counters collide or wrap in a way that breaks causal ordering after a very long-lived device pairing | Counter overflow or a device-ID collision (extremely unlikely but not impossible over a long enough horizon) corrupts ordering. | Sync-integrity check detects an ordering result that contradicts known real-world causality (e.g. a reply appears to precede its original, mirroring `docs/25-failure-modes/FM-10-021`'s own detection method). | Low | Use a sufficiently large counter space and globally-unique device IDs (already established via the pairing protocol's keypair, per `02-device-pairing-protocol.md`) to make collision/overflow practically impossible rather than merely unlikely. | Re-derive ordering from any available secondary signal (e.g. server-observed relay timestamps) for the specific affected window; this should be exceptionally rare given the mitigation. |
