# Modal — Component Spec

## Purpose

Reserved for blocking decisions only, per `docs/30-design/dialogs.md`; always dismissible via Escape and an explicit close control.

## States

Default, hover, focus, active/pressed, disabled, loading (if applicable) — all defined via design tokens (`docs/30-design/design-tokens.md`), never one-off styles.

## Accessibility

Full keyboard operability and correct ARIA role/label; verified against `docs/42-design-qa/accessibility-checklist.md` before merge.
