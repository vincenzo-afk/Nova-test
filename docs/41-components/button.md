# Button — Component Spec

## Purpose

Primary/secondary/destructive/ghost variants; destructive variant always requires the `dialogs.md` confirm pattern when the action is irreversible.

## States

Default, hover, focus, active/pressed, disabled, loading (if applicable) — all defined via design tokens (`docs/30-design/design-tokens.md`), never one-off styles.

## Accessibility

Full keyboard operability and correct ARIA role/label; verified against `docs/42-design-qa/accessibility-checklist.md` before merge.
