# Accessibility APIs (Execution Tier 6)

## Purpose

Describes structured UI-tree interaction — using Windows UI Automation to
read and manipulate application UI elements programmatically — as the
preferred mechanism whenever native/API/MCP/CLI paths are unavailable,
ranking above raw vision-based control specifically because it operates
on structured data rather than pixels.

## Scope

Accessibility-tree-specific mechanics. General tier-ordering rules are
`execution-priority.md`; the vision fallback used when this tier is also
unavailable is `vision.md`.

## Why this ranks above Vision

Windows UI Automation exposes an application's UI as a structured tree of
named, typed elements (buttons, text fields, menus) with programmatically
determinable state — this is deterministic and far more reliable than
pixel-based visual recognition, which is inherently probabilistic. Per
the project's foundational review, structured UI trees must always be
preferred over pixel-vision wherever an application exposes them, which
is exactly the ordering `execution-priority.md` encodes.

## Interaction model

Reads (finding an element, checking its current state) and writes
(invoking a button's action, setting a text field's value) both go
through UI Automation's programmatic interface rather than simulated
mouse coordinates — this means an accessibility-tier action targets "the
Save button" as a named element, not "the pixel at position (x, y),"
which remains correct even if the application's layout shifts slightly
between runs. Nova's desktop accessibility adapter exposes the read as a
separate `read_state` action and requires a task identifier, expected focused
window, and structured target metadata before it calls the native host.

## Verification signal

Post-action element state (e.g., confirming a checkbox's `IsChecked`
property actually changed, or a dialog's presence/absence) is read
directly from the accessibility tree and used as the ground-truth
verification signal (`docs/03-runtime/verifier.md`) — this is
structurally independent of the input mechanism itself, unlike vision
verification, which shares failure modes with vision-based action. The
implemented Windows adapter returns the matched element's name, automation
ID, control type, enabled/offscreen state, and exposed value. UI actions are
accepted as completed only when the task/window-bound state evidence is
present and valid.

## Application coverage limits

Not every application implements accessibility support completely or
correctly — some expose a shallow or generic tree that does not surface
the actual meaningful controls. Where accessibility-tree interaction
cannot reliably locate or manipulate the needed element (detected by the
interaction failing or the tree lacking sufficient detail), execution
falls through to Vision (`vision.md`) per `execution-priority.md`'s
escalation rule.

## Related documents

- `docs/25-failure-modes/FM-07-tool-execution-and-mcp.md` — failure modes for this subsystem
- `execution-priority.md` — this tier's place in the overall chain,
  including the escalation rule to Vision
- `vision.md` — the fallback tier used when accessibility support is
  insufficient
- `docs/03-runtime/verifier.md` — how accessibility state is used as
  ground truth
