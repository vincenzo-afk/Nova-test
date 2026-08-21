# Multi-Device Architecture

## Purpose

Repeals the v1 "single machine only" non-goal and specifies how NOVA runs
across a desktop, an Android companion, and any additional paired
desktops, per
`docs/15-decisions/adr-0008-v5-architecture-evolution.md`.

## Scope

Device topology, pairing, and per-platform runtime mapping. Memory
synchronization specifics are `cross-device-memory.md`; the Android app's
own capabilities are `android-companion.md`.

## Topology

NOVA is not client-server across devices — there is no NOVA-operated
backend (that non-goal is preserved). Instead, one device is the
**Primary Runtime** (typically the always-on desktop) running the full
Planner/Executor/Memory stack, and other devices are either:

- **Full peers** — another desktop also running the full runtime,
  synchronizing memory and task state bidirectionally, or
- **Companions** — a phone running a lighter client (`android-companion.md`)
  that captures input (voice, screen, notifications), issues requests to
  a Primary Runtime, and renders responses, without hosting its own
  Planner.

Which mode a device runs in is a pairing-time choice, editable later.

## Primary Runtime designation

The first device to complete setup (`docs/19-setup/setup-wizard.md`),
before any pairing has occurred, is the Primary Runtime by default —
there is no election or negotiation process, since a single unpaired
device is definitionally the only runtime that exists at that point.
Pairing a second device always pairs it *against* an existing Primary
Runtime; the pairing flow (below) never runs without one already
designated. This is a fixed role, not a fluctuating one: the Primary
Runtime does not change simply because another device becomes more
available or more powerful — it changes only through an explicit
migration, per `docs/28-multi-device-protocol/15-migration.md`'s "Primary
Runtime (or first device to upgrade)" handoff, or the disaster-recovery
path when the original Primary Runtime is permanently lost
(`docs/28-multi-device-protocol/11-recovery-and-backup.md`). In a
Full-Peer-only topology (no Companions), any one peer may be designated
Primary for the specific purposes that need a single coordinator (e.g.,
`docs/28-multi-device-protocol/16-operational-extras.md`'s
capability-request routing) without changing the fact that every Full
Peer already runs the complete stack independently.

## Pairing

Pairing a new device generates a keypair on the new device and exchanges
public keys with the Primary Runtime over a short-lived, user-confirmed
channel (QR code scan or local-network handshake) — never over the open
internet unauthenticated. The resulting pairing key is stored per
`docs/18-providers/credential-management.md` and used to authenticate all
subsequent sync and remote-control traffic between the two devices,
typically tunneled over Tailscale (`remote-control.md`).

## Per-platform runtime mapping

| Platform | Runtime mode | Notes |
|---|---|---|
| Windows | Full peer | Original v1 target; unchanged |
| macOS / Linux | Full peer | Distinct engineering effort per platform, as v1 non-goals noted — v5 schedules this rather than forbidding it |
| Android | Companion | `android-companion.md` |
| Browser extension | Surface, not a device | `docs/24-collaboration/` and browser-agent docs; shares the Primary Runtime's identity, not a separate paired device |

## Identity

A single NOVA identity spans all paired devices — one set of memory,
one knowledge graph, one permission configuration, propagated per
`cross-device-memory.md`. This is distinct from the v1 non-goal "not
multi-user," which is preserved: multiple *devices* under one *user's*
identity is in scope; multiple independent users sharing one NOVA
instance remains out of scope.

## Failure modes

If the Primary Runtime is unreachable, companion devices queue requests
locally and surface a clear "waiting to reconnect" state rather than
failing silently or attempting to run Planner logic locally without the
full context that requires.

## Related documents

- `docs/25-failure-modes/FM-10-desktop-android-distributed-sync.md` — failure modes for this subsystem
- `cross-device-memory.md` — sync and conflict resolution
- `android-companion.md` — the companion client itself
- `remote-control.md` — the transport pairing rides on
- `docs/00-overview/non-goals.md` (v2) — updated multi-device stance
- `distributed-task-scheduling.md` — how a Task is assigned when more
  than one Full Peer is available, an exception to this document's
  originating-device default
