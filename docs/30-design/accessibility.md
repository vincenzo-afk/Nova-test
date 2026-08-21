# Design Accessibility

Minimum contrast 4.5:1 for text, 3:1 for UI component boundaries. Every interactive element has a visible focus state distinct from hover state. Focus order in every screen spec (`40-screens/`) is explicitly diagrammed, not left to DOM order by accident.

Scope note: this document covers visual/interaction styling (contrast, focus-state appearance, focus order) only. Screen-reader labels, reduced-motion behavior, and voice-as-accessibility-surface requirements are specified in `docs/29-product/accessibility.md`, not here — the two are complementary, not duplicates, and a screen's accessibility requirements draw from both.
