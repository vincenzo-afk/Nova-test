# Lifecycle Patterns (Cross-Subsystem)

## Purpose

Every stateful subsystem in the multi-device world benefits from the same
generic lifecycle shape. Rather than defining a bespoke lifecycle per
subsystem, this document states the shared pattern once and shows how
each subsystem instantiates it — reducing the number of genuinely novel
state machines an implementer needs to hold in their head, and making
`docs/26-system-reference/04-state-transition-tables.md`'s existing
Plugin/Workflow tables recognizable as instances of one pattern rather
than unrelated designs.

## The generic pattern

```
Installed → Loaded → Started → Running → Paused → Updating → Stopping → Stopped → Unloaded
```

Not every subsystem uses every state (a Device, for instance, has no
meaningful `Installed`/`Unloaded` — it has `Registered`/`Removed`
instead, per `01-cross-device-sync.md`) — the pattern is a menu each
subsystem draws its actual state machine from, not a rigid template every
subsystem must fully implement.

## Instantiations

| Subsystem | Full state machine | Reference |
|---|---|---|
| Plugin | `Installed → Enabled ⇄ Disabled, Enabled → Updating → Enabled/Failed, Failed → Disabled, Enabled → Deprecated → Uninstalled, Disabled → Uninstalled` — a specialization: `Installed`≈`Installed`, `Enabled`≈`Running`, `Disabled`≈`Paused`, `Uninstalled`≈`Unloaded`; adds `Deprecated` and `Failed` as extra branches the generic pattern doesn't name; has no `Discovered` state distinct from `Installed` | `docs/16-extensibility/plugin-lifecycle.md` (canonical); table form in `docs/26-system-reference/04-state-transition-tables.md` |
| Device | `Discovered → Registered → Trusted → Active (⇄ Idle/Sleeping/Offline) → Removed` | `01-cross-device-sync.md`, `04-presence-and-capabilities.md` — a specialization: `Registered`≈`Installed`, `Trusted`≈`Loaded`, `Active`≈`Running`, `Removed`≈`Unloaded`, with no `Paused`/`Updating` equivalent since a device isn't paused/updated the way software is (though a device's *NOVA installation* can be, per `Updating` presence state) |
| Workflow | `Pending → Ready → Running → Succeeded/Failed/DeadLettered` | `docs/26-system-reference/04-state-transition-tables.md` — a simpler specialization without `Paused`/`Updating`, since workflows are comparatively short-lived |
| Voice | `Idle → Listening → Processing → Responding → Idle` (⇄ `Muted` as a Paused-equivalent) | `docs/22-voice/voice-assistant.md`; `Muted` maps to the generic `Paused` |
| Memory | `Uninitialized → Loading → Ready → (write operations) → Ready` (⇄ `Degraded` on partial failure, per `docs/25-failure-modes/FM-01-*`) | `docs/04-memory/memory-architecture.md` — Memory has no `Stopped`/`Unloaded` equivalent while NOVA is running, since Memory being unavailable is itself the critical-service-failure case in `docs/26-system-reference/02-startup-sequence.md`, not an ordinary lifecycle transition |
| Session | `Active ⇄ Idle → Expired` | `docs/26-system-reference/04-state-transition-tables.md` — the simplest specialization, with `Expired` as this subsystem's terminal state rather than `Unloaded` |

## Why this matters for multi-device specifically

In a single-device system, lifecycle mismatches are usually caught
quickly (the one device either works or doesn't). Across devices, two
peers can each be a valid-but-different point in the *same* subsystem's
lifecycle simultaneously (e.g. Device A still `Running` a plugin that Device B has already moved to `Stopping` as part of an uninstall
propagating across devices) — recognizing that both are instances of one
shared pattern makes it possible to reason about "what does inconsistency
between two devices' lifecycle states even mean" generically, rather than
re-deriving that reasoning per subsystem.

## Related documents

- `docs/26-system-reference/04-state-transition-tables.md` — full tables
  for the subsystems whose lifecycle is documented there in detail
- `docs/22-voice/voice-assistant.md`, `docs/04-memory/memory-architecture.md` — full detail for the subsystems specialized above

## Where This Breaks

Failure modes specific to this protocol area. Cross-referenced from `docs/25-failure-modes/FM-26-multi-device-protocol.md`, which indexes all multi-device failure entries in one place, and from `FM-10-desktop-android-distributed-sync.md` for the general distributed-systems failure classes this protocol area instantiates.

| ID | Failure | Trigger | Detection | Severity | Mitigation | Recovery |
|---|---|---|---|---|---|---|
| **FM-26-034** | A subsystem's lifecycle is implemented ad hoc, not recognized as an instance of this pattern, and ends up missing a state the pattern would have prompted for (e.g. a new subsystem ships with no `Paused` equivalent when one is actually needed) | Implementer designs a lifecycle for a new subsystem without consulting this pattern first. | Design review comparing the new subsystem's lifecycle against this document's menu of states finds an unjustified gap. | Low | Require any new stateful subsystem's design doc to explicitly state which states from this generic pattern it uses and which it deliberately omits and why (as done in the Instantiations table above), not silently invent an unrelated lifecycle. | Add the missing state if the review finds it's genuinely needed; document the intentional omission if not. |
| **FM-26-035** | Two devices show two different, both individually-valid, lifecycle states for the same logical entity, and no rule exists for which one 'wins' for a decision that needs a single answer | e.g. Device A shows a plugin `Running`, Device B (mid-uninstall-propagation) shows it `Stopping` — and a third device needs to know 'is this plugin currently active' as a single yes/no. | A cross-device decision (e.g. whether to route a capability request to that plugin) is made against a stale or device-specific view without resolving the ambiguity. | Medium | Any cross-device decision depending on a lifecycle state must specify which device's view is authoritative for that decision (usually: the device that would actually execute the action), not silently pick whichever answer arrives first. | Query the specific authoritative device directly for the decision at hand rather than relying on a possibly-stale synced lifecycle-state field. |
