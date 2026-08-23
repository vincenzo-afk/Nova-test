# Desktop Agent Integration

## Purpose

This document is the source-of-truth contract for Nova's local Windows desktop-agent slice. It covers **one-shot task-bound screenshot capture** and **structured Windows UI Automation actions**. It does not authorize continuous screen observation, arbitrary application control, raw keyboard/mouse injection, or vision-guided coordinate input.

## Permission identifiers

The desktop permission model defines these explicit, revocable, off-by-default grants:

| Identifier        | Scope                         | Capture or action allowed                                                                                                                  |
| ----------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `screen`          | Screen observation            | A task-bound screenshot of the full virtual screen or current focused window, requested on demand. Raw frames are not persisted or logged. |
| `desktop_control` | Desktop accessibility control | A structured Windows UI Automation `invoke` or `set_value` action against the currently focused, expected window.                          |

These identifiers are distinct from the existing `applications` and `windows` observer grants. `applications` and `windows` maintain the World Model's application/focus context; `screen` and `desktop_control` do not start background observers.

## Execution order

Nova must follow the documented execution priority chain. Windows UI Automation is the preferred desktop-control path and is registered at the **accessibility** tier. Screenshot capture is registered separately at the **vision** tier for perception only. This slice does not implement a keyboard/mouse fallback. A future vision-guided input adapter must maintain an explicit application allow-list and use fresh before/after snapshots; it must not infer permission from the presence of `screen` alone.

## Screenshot contract

A screenshot request must include a non-empty `task_id`, a target of `screen` or `focused-window`, and an optional `max_bytes` bounded from 1 KiB through 8 MiB. Focused-window capture requires a current World Model focus record and passes its window identifier to the native host. Full-screen capture uses the Windows virtual-screen bounds; focused-window capture uses the selected window rectangle. The native host returns PNG bytes, actual positive width and height, byte length, base64 data, and capture time. Nova validates the base64 payload and byte count before returning structured API-response evidence.

Raw frame data is session/task ephemeral. It is not written to SQLite, Working Memory, audit records, diagnostic logs, or the renderer outside the explicit one-shot response. Only an approved, derived structured observation may be adopted through the existing observation-indexing boundary.

## UI Automation action contract

A UI action must include a non-empty `task_id`, action identifier, `invoke` or `set_value` operation, structured target metadata (`name` and/or `automation_id`, with optional `control_type`), and `expected_window_id`. Nova re-reads World Model focus immediately before calling the native bridge and pauses with a typed validation error when the expected window no longer has focus. The native host re-checks foreground focus again before resolving the UI Automation root.

`invoke` uses `InvokePattern`. `set_value` uses `ValuePattern` and reads the resulting value as `accessibility_state` evidence. The native host uses bounded PowerShell/C# execution with `shell: false`, a 15-second timeout, structured JSON input/output, and no arbitrary shell or raw input path.

Destructive or irreversible UI actions require explicit confirmation. Permission revocation is checked at the controller boundary on every request, so revocation rejects new capture/control operations immediately. Accessibility actions use the `desktop.focus` and `desktop.accessibility` resource locks; screenshots use the `desktop.screen` lock.

## Runtime and IPC boundaries

The Electron renderer calls only typed preload methods. Preload forwards `nova:desktop:screenshot` and `nova:desktop:ui-action` to Electron main. Electron main converts each request into an `ExecutionStep` and routes it through RuntimeApplication's ToolRegistry, PermissionManager, Executor, ResourceManager, and Verifier. The native bridge is owned by Electron main and is never exposed to the renderer.

Registered tools are:

| Tool                         | Tier            | Actions                              | Verification          |
| ---------------------------- | --------------- | ------------------------------------ | --------------------- |
| `nova.screen-capture`        | `vision`        | `screenshot`                         | `api_response`        |
| `nova.desktop-accessibility` | `accessibility` | `ui_action`, `ui_action_destructive` | `accessibility_state` |

## Validation boundary

Sandbox validation exercises controller permission/focus/confirmation gates, native-script primitives, preload isolation, ToolRegistry metadata, Executor confirmation behavior, RuntimeApplication composition, formatting, linting, typechecking, links, tests, and the Electron build. No Windows host is connected in the current development session; therefore the PowerShell/C# capture and UI Automation path remains **deferred for live Windows validation**.

## Explicit non-goals of this slice

This implementation does not provide browser extension control, OCR or a vision model, application allow-list enforcement for future coordinate input, raw keyboard/mouse injection, continuous screen streaming, speech input/output, arbitrary shell execution, or persistence of raw screenshots. Those features require their own documented contracts and release gates before implementation.
