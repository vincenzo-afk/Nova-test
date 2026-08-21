# Toolbar — Component Spec

## Purpose

Contextual action bar bound to the current screen/selection; never shows more than 5 primary actions before overflowing to a menu.

## States

Default, hover, focus, active/pressed, disabled, loading (if applicable) — all defined via design tokens (`docs/30-design/design-tokens.md`), never one-off styles.

## Accessibility

Full keyboard operability and correct ARIA role/label; verified against `docs/42-design-qa/accessibility-checklist.md` before merge.
