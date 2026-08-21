# Tabs — Component Spec

## Purpose

Used for switching between views of the same data (e.g. Memory Explorer's Timeline/Graph/Search tabs), never as a substitute for navigation.

## States

Default, hover, focus, active/pressed, disabled, loading (if applicable) — all defined via design tokens (`docs/30-design/design-tokens.md`), never one-off styles.

## Accessibility

Full keyboard operability and correct ARIA role/label; verified against `docs/42-design-qa/accessibility-checklist.md` before merge.
