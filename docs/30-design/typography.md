# Typography

Two-typeface system: one for UI chrome (high legibility at small sizes), one optional monospace for code/CLI output panes. Base size 14px desktop, scalable via OS accessibility text-size settings — the app must respect OS-level text scaling, not just an in-app slider.

## Type scale

Sizes (px, desktop base): 12 (caption/metadata), 14 (body, base size),
16 (subheading), 20 (heading), 24 (page title). No component uses a
font-size outside this scale — enforced by
`docs/42-design-qa/typography-rules.md`.

## Line height

1.4 minimum for body text (12/14/16px sizes) for readability; 1.2
minimum for heading sizes (20/24px), where tighter line height is
appropriate given shorter line lengths at those sizes. Both are tokens,
not per-component overrides.
