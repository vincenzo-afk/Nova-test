# Applications Observer

## Purpose

Tracks installed, running, launched, and closed applications, feeding
both the Knowledge Graph's Application node type
(`docs/04-memory/ontology.md`) and the World Model's live "what is
running now" view (`docs/03-runtime/world-model.md`).

## Scope

Application-lifecycle capture logic. Shared framework behavior is
`docs/03-runtime/observer.md`.

## Captured signals

- **Install/uninstall** — via the Windows package/registry APIs, capturing
  application name, install path, and version where the installer exposes
  it.
- **Launch/close** — process start/stop events, capturing process name,
  start time, and (on close) duration.
- **Version changes** — detected on next launch after an update, where
  version information is available from the application itself.

## What this observer does not do

It does not inspect an application's internal state, open documents, or
in-app data — that is either the Windows/Browser observer's domain
(for window titles and browser tabs specifically) or explicitly out of
scope entirely. An application's mere presence and running state is
tracked; what a user is doing inside it is inferred only from window
titles/focus (`windows.md`) or explicit user statements, never from
inspecting the application's internals.

## Use in tool selection

Knowing which applications are installed and running is a direct input
to `docs/06-tools/execution-priority.md`'s tier resolution — e.g.,
confirming an application is not already open before a "launch" action is
planned, or confirming a required application is installed before
attempting an Accessibility or Vision-tier interaction with it.

## Version-aware tool compatibility

Where a registered tool (particularly Accessibility or Vision tier
tools, `docs/06-tools/accessibility.md`, `docs/06-tools/vision.md`)
is known to behave differently across application versions, this
observer's version-tracking is what allows the Tool Registry
(`docs/06-tools/tool-registry.md`) to flag a version mismatch rather than
attempting an interaction pattern built against a different UI layout.

## Related documents

- `docs/25-failure-modes/FM-10-desktop-android-distributed-sync.md` — failure modes for this subsystem
- `docs/03-runtime/observer.md` — the shared framework this source
  implements
- `docs/03-runtime/world-model.md` — the live-state consumer of this
  observer's output
- `windows.md` — the complementary window-level observer
