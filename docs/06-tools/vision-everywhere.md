# Vision Everywhere

## Purpose

Unifies vision capability across every surface NOVA now touches —
desktop, phone, camera, and browser — under the single Vision provider
domain (`docs/18-providers/provider-interface.md`), so "vision" is one
capability with multiple capture sources rather than four separate
implementations.

## Scope

How the existing desktop vision tier (`docs/06-tools/vision.md`) and the
new phone/camera/browser sources compose. This document does not
introduce a new visual-understanding model or relax
`docs/06-tools/vision.md`'s allow-list restriction — every source below
still routes through that same tier's rules for automation, differing
only in capture origin.

## Sources

| Source | Capture mechanism | Doc |
|---|---|---|
| Desktop screen | Screenshot-based, allow-list restricted | `docs/06-tools/vision.md` |
| Phone screen | MediaProjection streaming from companion device | `docs/20-devices/screen-streaming.md` |
| Phone/device camera | Camera capture via companion app | `docs/20-devices/android-companion.md` |
| Browser (in-page) | DOM-first, vision fallback only for non-DOM-affordant pages | `docs/24-collaboration/browser-agent.md` |

All four register frames/screenshots against the same Vision Provider
interface and are processed by whichever Vision provider
(`docs/18-providers/provider-routing.md`) is active — a local VLM or a
cloud vision API sees a desktop screenshot and a phone camera frame
through the identical request shape.

## Shared rules across all sources

- **Session-scoped, not continuous surveillance.** Every source captures
  only for the duration of an active task or explicit user request,
  per the existing tiering philosophy in `docs/06-tools/vision.md` and the session model in `docs/20-devices/screen-streaming.md`.
- **Automation stays tiered.** Any action taken as a result of visual
  understanding — clicking something seen on a desktop screenshot,
  tapping something seen on a phone screen, filling a form seen in a
  browser tab — follows `docs/06-tools/execution-priority.md`'s ordering:
  a structured API/Accessibility/DOM path is always preferred over acting
  on vision output alone.
- **Allow-list restriction is per-surface, not lifted by aggregation.**
  Desktop vision-driven automation remains restricted to the maintained
  allow-list in `docs/06-tools/vision.md`; unifying the capability
  registry entry does not grant desktop automation rights to every app a
  phone camera happens to photograph.
- **Raw frames are not retained by default** across all four sources —
  only derived, structured observations are eligible for memory storage,
  per `docs/04-memory/memory-lifecycle.md`.

## Related documents

- `docs/25-failure-modes/FM-09-browser-and-vision.md` — failure modes for this subsystem
- `docs/06-tools/vision.md` — the original desktop tier and allow-list
  rule, unchanged
- `docs/20-devices/screen-streaming.md`, `docs/20-devices/android-companion.md`
  — phone-side sources
- `docs/24-collaboration/browser-agent.md` — browser-side source
- `docs/18-providers/provider-interface.md` — shared Vision domain
  interface
