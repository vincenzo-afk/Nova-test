# Cross-Device Permissions & Notification Routing

## Cross-device permission requests

When Device A needs a capability only Device B has (per
`04-presence-and-capabilities.md`'s negotiation), and Device B hasn't
already granted that capability category, the request flow is:

```
Desktop needs camera
      ↓
Desktop → Phone: capability request
      ↓
Phone prompts user: "Desktop wants to use your camera. Accept?"
      ↓
User chooses:
   Accept (always)  |  Accept (temporary)  |  Reject
      ↓
Phone records grant per docs/10-security/permissions.md's scoping model
      ↓
Phone → Desktop: Supported / Permission denied
```

This is structurally the same consent gate as
`docs/20-devices/remote-control.md`'s session-approval flow and
`docs/10-security/permissions.md`'s general permission model — cross-
device capability requests are not a separate, lighter-weight permission
system; they route through the same Permission Manager
(`docs/26-system-reference/05-data-ownership.md`'s ownership table) as
any other permission grant, just with the requester being a remote
device instead of a local plugin/tool.

`Accept (temporary)` follows the same time-boxed, no-silent-permanent-
grant rule as `docs/20-devices/remote-control.md`'s "trust my phone for
12 hours" pattern.

## Notification routing

The routing rule is presence-driven, per `04-presence-and-capabilities.md`:

```
Desktop Active   → Don't notify Phone   (avoid redundant interruption)
Desktop Sleeping → Notify Phone          (Desktop can't surface it)
Phone Active     → Mute Desktop          (symmetric rule, whichever device
                                           the user is actually looking at wins)
```

More precisely: a notification is routed to exactly one device — the one
most likely to be actively observed, determined by presence state, with
a defined tie-break (most-recently-active device) when more than one
device shows `Active`/`Online` simultaneously. This avoids the common
multi-device failure mode of duplicate notifications firing on every
paired device for the same event.

## Related documents

- `docs/10-security/permissions.md` — the general permission-grant model
  this reuses
- `docs/20-devices/remote-control.md` — the equivalent consent pattern
  for live remote-control sessions
- `04-presence-and-capabilities.md` — the presence states routing decisions key off

## Where This Breaks

Failure modes specific to this protocol area. Cross-referenced from `docs/25-failure-modes/FM-26-multi-device-protocol.md`, which indexes all multi-device failure entries in one place, and from `FM-10-desktop-android-distributed-sync.md` for the general distributed-systems failure classes this protocol area instantiates.

| ID | Failure | Trigger | Detection | Severity | Mitigation | Recovery |
|---|---|---|---|---|---|---|
| **FM-26-020** | Notification routed to a device that just became inactive, arriving too late to be seen promptly | Presence staleness (see `FM-26-011`) causes the routing decision to be made against an out-of-date presence snapshot. | User reports a notification 'went to the wrong device' or arrived late. | Low | Route based on presence at the moment of delivery, re-checked immediately before sending, not a cached value from when the triggering event first occurred. | Re-route/duplicate the notification to the now-more-appropriate device if the delay exceeds a threshold, rather than leaving it stranded on a now-inactive device. |
| **FM-26-021** | Permission granted as `Accept (temporary)` outlives its intended window due to a timer bug | Temporary grant's expiry isn't enforced correctly, functioning as permanent. | Audit of active grants finds a temporary grant older than its stated window still active. | High | Same enforcement discipline as `docs/25-failure-modes/FM-18-016`'s approval-timeout handling — temporary grants must be actively expired by the owning device, not just optimistically assumed to lapse. | Immediately revoke the overdue grant; audit what was accessed during the improperly-extended window, treating it with the same severity as `docs/25-failure-modes/FM-12-004` if anything sensitive was accessed. |
| **FM-26-022** | Duplicate notifications fire on two devices simultaneously despite the single-device routing rule | Tie-break logic for 'more than one device Active' has a race condition, or presence updates arrive out of order across devices. | User reports receiving the same notification on two devices at once. | Low | Make the tie-break deterministic and based on a single source of truth (e.g. the sync endpoint resolving the routing decision once, not each device deciding independently). | No data-loss risk; treat as a UX annoyance to fix, tracked via the routing-decision race condition identified. |
