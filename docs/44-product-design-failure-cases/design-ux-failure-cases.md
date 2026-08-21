# Design / UX Failure Cases — Required States Per Screen


Every screen in `40-screens/` must define explicit behavior for each of the following states. This list is the checklist `42-design-qa/` and
code review (`docs/43-ai-development/review-checklist.md`) verify against — a
screen missing any applicable state below is not done.

- Loading
- Empty
- No results (distinct from empty: a filter/search produced zero matches)
- Permission denied
- Offline
- Slow network
- Partial data
- Corrupted data
- Timeout
- Retry (in progress)
- Disabled feature (flag off, or plan/edition doesn't include it)
- Unsupported device
- Unsupported provider
- Maintenance mode
- Low battery (mobile)
- Reduced motion enabled
- Screen reader enabled
- High contrast mode
- Keyboard-only navigation
- Very long text (overflow handling)
- Very large images
- Very small screens
- Ultra-wide screens

These are implementation contracts, not visual polish — a build that
handles only "Loading" and "Populated" for a given screen is incomplete
per `docs/43-ai-development/definition-of-done.md`.
