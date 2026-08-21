# AI Phone

## Purpose

Specifies the longer-horizon extension of `android-companion.md` in
which the phone becomes a primary interaction terminal for NOVA — every
app, notification, and interaction on the phone treated as something
NOVA can see and mediate — rather than a capture/render surface for a
desktop-hosted runtime.

## Scope

This document specifies the target architecture and the staged path
toward it. It does not claim the phone becomes a replacement OS; NOVA
runs as the phone's assistant layer, not as a substitute for Android
itself.

## Relationship to the Android Companion

`android-companion.md` already supports notification access, app
control, file access, vision, and voice from the phone. "AI Phone" is
the point on that same architecture's continuum where:

- The phone can run a full local Planner instance itself (a "Full peer"
  in `multi-device-architecture.md` terms) rather than only Companion
  mode, when on-device hardware and battery budget support it
  (`docs/18-providers/hardware-detection.md` determines this per device).
- Voice becomes the default primary interface (`docs/22-voice/voice-assistant.md`),
  with the phone effectively always ready to receive a spoken command
  as its main mode of interaction, not a secondary input method.
- App control coverage is broad enough, and paired closely enough with
  notification and file access, that most day-to-day phone tasks can be
  delegated to NOVA rather than performed by directly opening apps.

## Staged path

1. Companion mode (shipped): capture and remote-execute, per
   `android-companion.md`.
2. Hybrid mode: phone runs lightweight local models for STT/wake-word and
   simple deterministic tool calls; heavier reasoning still delegates to
   a Primary Runtime over `remote-control.md`'s transport.
3. Full-peer mode: phone runs a complete local Planner/Executor,
   hardware permitting, syncing memory per `cross-device-memory.md` like
   any other full peer, with the desktop becoming optional rather than
   required.

Each stage is additive and configurable — a user is never forced past
Companion mode, and hardware detection prevents Full-peer mode from being
offered on a device that can't sustain it.

## What stays constant across stages

- Every Android runtime permission is requested individually and
  revocable, per `android-companion.md`.
- Destructive actions always require confirmation, per
  `docs/10-security/permissions.md`, regardless of which stage the phone
  is operating in.
- The phone is never a hosted multi-tenant surface — it is the user's own
  device, running the user's own configured providers.

## Related documents

- `docs/25-failure-modes/FM-10-desktop-android-distributed-sync.md` — failure modes for this subsystem
- `android-companion.md` — the shipped capability set this extends
- `multi-device-architecture.md` — Full peer vs. Companion mode definition
- `docs/22-voice/voice-assistant.md` — the primary interface at full
  maturity
