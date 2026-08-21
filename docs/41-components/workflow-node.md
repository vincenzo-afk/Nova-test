# Workflow Node — Component Spec

## Purpose

Visual representation of a workflow step/condition/gate; shows a live execution status with color + icon, never color alone (accessibility). This component's five display states are a UI-only simplification of the real per-node state machine (`docs/03-runtime/task-manager.md`'s Task states, per `docs/17-workflow/workflow-engine.md`'s Workflow state section — a workflow node's state is a task's state), not a sixth, competing state model. The mapping: **pending** (`Created`/`Planning`/`WaitingResources`/`Paused`/`WaitingUser`, i.e. not yet executing), **running** (`Executing`/`Verifying`/`Retrying`), **success** (`Completed`), **failed** (`Failed`/`Unverified` — both render as failed here since this component's compact badge has no room to distinguish them; a user wanting that distinction opens the full Task Monitor detail, `docs/09-ui/task-monitor.md`), **skipped** (a node on a decision branch that was not taken — not itself a Task state, since the node simply never had a task created for it).

## States

Default, hover, focus, active/pressed, disabled, loading (if applicable) — all defined via design tokens (`docs/30-design/design-tokens.md`), never one-off styles.

## Accessibility

Full keyboard operability and correct ARIA role/label; verified against `docs/42-design-qa/accessibility-checklist.md` before merge.
