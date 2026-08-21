# Remote Control

## Purpose

Specifies how a user controls one paired device's NOVA (and, through it,
that device) from another — e.g., issuing a command from a phone that
executes on the desktop — over a private, encrypted mesh (Tailscale or an
equivalent WireGuard-based network), without exposing any device on the
open internet.

## Scope

Transport, session, and authorization model for remote control. Device
pairing identity is `multi-device-architecture.md`; this document is the
transport and live-session layer built on top of it.

## Transport

NOVA does not implement its own VPN/mesh networking — it integrates with
a user-configured mesh network provider (Tailscale by default; the
integration follows `docs/18-providers/provider-interface.md`'s pattern,
so another WireGuard-based mesh can be substituted without touching
NOVA Core). Devices reach each other only over that private network;
NOVA never opens a public listening port.

## Session model

A remote-control session is explicit and time-boxed:

1. The initiating device sends a signed session request over the mesh.
2. The target device's NOVA prompts for approval, unless the user has
   pre-approved that specific initiating device for a defined window
   (e.g., "trust my phone for 12 hours") — never a permanent, silent
   auto-approval.
3. On approval, the initiating device can issue commands that execute
   through the target's normal Planner/Executor/Permission pipeline —
   **remote commands are not a privileged path**; they hit the same
   confirmation gates for destructive actions
   (`docs/10-security/permissions.md`) as a locally typed command.
4. The session ends on timeout, explicit disconnect, or revocation from
   either side.

## What "control" covers

- Issuing NOVA commands to be planned/executed on the target device.
- Viewing the target device's Task Monitor and recent activity.
- Optionally, direct input (mouse/keyboard) forwarding for manual
  intervention, which is treated as Tier 2/3 execution per
  `docs/06-tools/execution-priority.md` and requires its own explicit
  grant separate from basic command issuance.

## Auditing

Every remote-control session — its initiating device, approval method,
duration, and every command executed within it — is written to
`docs/10-security/audit.md`, tagged distinctly from locally issued
commands so a user reviewing history can always tell a command originated
remotely.

## Failure and revocation

Revoking a device's remote-control trust (from either device) takes
effect immediately and ends any live session; it does not require the
other device to be online to take effect locally.

## Related documents

- `docs/25-failure-modes/FM-10-desktop-android-distributed-sync.md` — failure modes for this subsystem
- `multi-device-architecture.md` — pairing and identity this builds on
- `docs/10-security/permissions.md` — the confirmation gates remote
  commands still pass through
- `docs/10-security/audit.md` — remote-session logging
