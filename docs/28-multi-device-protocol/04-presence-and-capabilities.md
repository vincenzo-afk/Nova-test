# Presence & Device Capabilities

## Presence states

| State | Meaning |
|---|---|
| `Online` | Device reachable and NOVA runtime active |
| `Idle` | Reachable, but no user interaction for a configured window |
| `Busy` | Actively executing a task/workflow that shouldn't be interrupted by a new remote request without explicit override |
| `Sleeping` | OS-level sleep; device unreachable until wake (per `docs/02-architecture/lifecycle.md`'s sleep/wake handling) |
| `Offline` | Not reachable; last-known state retained for other devices' reference |
| `Syncing` | Actively catching up on a sync backlog; treated as available for read-only queries but not necessarily for new remote-execution requests until sync completes |
| `Updating` | Mid-`nova upgrade`; unavailable for remote execution, visible as a distinct state so other devices don't mistake it for `Offline`/failure |

Presence is itself synced (lowest priority, per `01-cross-device-sync.md`)
so other devices have a reasonably fresh view without needing to
actively poll.

## Device capabilities

NOVA never assumes every device can do everything — each device
advertises its actual capabilities at registration (`02-device-pairing-protocol.md`) and keeps them updated as hardware/permissions change.

| Device class | Typical capabilities |
|---|---|
| Desktop | GPU, Voice (mic/speaker), Filesystem (full), USB, large local model inference |
| Phone | Camera, GPS, Bluetooth, Notifications, Voice (mic/speaker), constrained local inference |

Capabilities are not fixed per device class — a specific desktop may lack
a GPU, a specific phone may lack GPS permission — the advertised list is
always the actual current device, never inferred from device class
alone.

## Capability negotiation

```
Desktop asks Phone:
  "Can you use camera?"
  "Can you use microphone?"
  "Can you use GPS?"
  "Can you use Bluetooth?"

Phone replies, per capability:
  Supported
  Not supported
  Permission denied
```

Three distinct answers matter here, not just yes/no: `Not supported`
(hardware/software genuinely absent — no point re-asking) vs.
`Permission denied` (hardware present but the user hasn't granted access
— worth prompting for, distinct handling per
`07-permissions-and-notifications.md`) vs. `Supported`.

Negotiation happens per-request, not once at pairing time only — a
capability's actual availability (especially permission state) can
change between pairing and the moment it's actually needed, so the
Desktop always re-asks immediately before a remote-execution request
depending on it (see Where This Breaks in
`03-session-continuity-and-handoff.md`, `FM-26-009`, for what happens
when this re-ask is skipped).

## Related documents

- `docs/18-providers/hardware-detection.md` — the equivalent
  single-device capability detection this negotiation extends across devices
- `03-session-continuity-and-handoff.md` — remote execution built on
  successful negotiation
- `07-permissions-and-notifications.md` — what happens on `Permission denied`

## Where This Breaks

Failure modes specific to this protocol area. Cross-referenced from `docs/25-failure-modes/FM-26-multi-device-protocol.md`, which indexes all multi-device failure entries in one place, and from `FM-10-desktop-android-distributed-sync.md` for the general distributed-systems failure classes this protocol area instantiates.

| ID | Failure | Trigger | Detection | Severity | Mitigation | Recovery |
|---|---|---|---|---|---|---|
| **FM-26-011** | Presence state is stale enough to mislead a remote-execution decision | Device went `Offline` abruptly (crash, network loss) without a clean state transition, so its last-synced presence still shows `Online`/`Idle`. | Remote-execution request sent to a device that's actually unreachable, timing out instead of failing fast. | Medium | Heartbeat-based presence with a bounded staleness window — a presence value older than the heartbeat interval is treated as `Offline` regardless of its last recorded value, not trusted indefinitely. | Time out the request per normal handling and re-check presence before retrying, rather than assuming the stale value is still accurate. |
| **FM-26-012** | Capability advertised as `Supported` is actually broken at the OS level (e.g. camera hardware present but driver-level failure) | Advertisement is based on permission/hardware-presence checks that don't exercise the capability end-to-end. | Remote-execution request against the capability fails despite a `Supported` answer. | Low | Where feasible, capability checks must do a lightweight functional probe, not just a presence/permission check, mirroring `docs/25-failure-modes/FM-25-005`'s doctor-check-depth lesson. | Downgrade the capability to a distinct `Degraded` status after a functional failure, rather than only ever reporting binary supported/not-supported. |
| **FM-26-013** | Negotiation is skipped entirely for a well-known/assumed capability | Implementation shortcut assumes 'phones always have a camera' and skips negotiation for that specific capability, breaking on a device that genuinely lacks or has disabled it. | Remote-execution request fails on a device where negotiation would have caught the gap in advance. | Low | No capability is exempt from negotiation, regardless of how common it seems across device class — stated explicitly above as a design rule. | Add the skipped negotiation step back for the specific capability; audit for other capabilities that received the same shortcut. |
