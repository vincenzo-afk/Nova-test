# List — Component Spec

## Purpose

Virtualized list for any collection that can exceed ~50 items (memory results, logs) to keep the UI responsive per `docs/39-performance-budgets/` budgets.

## States

Default, hover, focus, active/pressed, disabled, loading (if applicable) — all defined via design tokens (`docs/30-design/design-tokens.md`), never one-off styles.

## Accessibility

Full keyboard operability and correct ARIA role/label; verified against `docs/42-design-qa/accessibility-checklist.md` before merge.
