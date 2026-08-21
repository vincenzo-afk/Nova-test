# Prompt Box — Component Spec

## Purpose

Chat/voice input control; supports multiline, attachment, and a visible 'Planner is thinking' state distinct from plain loading.

## States

Default, hover, focus, active/pressed, disabled, loading (if applicable) — all defined via design tokens (`docs/30-design/design-tokens.md`), never one-off styles.

## Accessibility

Full keyboard operability and correct ARIA role/label; verified against `docs/42-design-qa/accessibility-checklist.md` before merge.
