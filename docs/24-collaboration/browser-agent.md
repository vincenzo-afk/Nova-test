# Browser as Part of NOVA

## Purpose

Extends `docs/07-observers/browser.md` from passive tab/URL observation
into a full reasoning-and-automation surface: every tab feeds memory,
memory feeds reasoning, reasoning can drive automation — addressing the
requirement that the browser become part of NOVA rather than something
NOVA merely watches.

## Scope

The additional capability layered on the existing browser extension.
`docs/07-observers/browser.md`'s capture mechanism, signal set, and
exclusions are unchanged and remain authoritative for what is observed;
this document adds what NOVA can now *do* with that observation and
*within* the browser.

## The four-stage extension

1. **Every tab** — capture is unchanged from
   `docs/07-observers/browser.md` (URL, title, navigation events; content
   capture remains opt-in and subject to the same sensitive-data
   exclusions already specified there).
2. **Memory** — with content capture enabled for a given site or
   session, page content is chunked and indexed into the same memory/
   knowledge-graph substrate as any other source
   (`docs/04-memory/memory-architecture.md`), tagged with provenance
   (URL, timestamp) so retrieval always attributes back to source,
   consistent with `docs/04-memory/memory-confidence.md`.
3. **Reasoning** — the Planner can query browser-derived memory the same
   way it queries any memory source ("what was that pricing page I had
   open yesterday") and can reason across multiple open tabs as related
   context for a single task (e.g., comparing specs across several open
   product pages).
4. **Automation** — the extension can, subject to the existing
   Tool/Execution-priority ordering (`docs/06-tools/execution-priority.md`),
   perform in-page actions: filling forms, clicking, extracting
   structured data — implemented through the extension's DOM-level access
   first (a higher, more reliable tier than screenshot-based vision),
   falling back to `docs/06-tools/vision.md`'s allow-list-restricted
   visual tier only for pages with no usable DOM affordance.

## What does not change

- **The extension remains the sole capture mechanism** —
  `docs/07-observers/browser.md`'s explicit preference for a visible,
  inspectable extension over lower-level browser interception is
  unchanged and applies to automation as much as observation.
- **In-page automation is still gated by
  `docs/10-security/permissions.md`.** Filling a form is reversible;
  submitting one that has real-world effect (a purchase, a public post)
  is treated as an irreversible action requiring confirmation, exactly as
  any other tool-driven irreversible action would be.
- **Content capture stays opt-in per site**, and the existing sensitive-data
  stripping in `docs/07-observers/browser.md` applies identically to
  content indexed for reasoning.
- **This is not a general RPA grant.** In-page automation follows the same
  allow-list-first, vision-as-last-resort philosophy as
  `docs/06-tools/vision.md` — the browser gaining a reasoning role does
  not relax NOVA's "not a general-purpose RPA platform" non-goal.

## Related documents

- `docs/25-failure-modes/FM-09-browser-and-vision.md` — failure modes for this subsystem
- `docs/07-observers/browser.md` — capture mechanism this extends
- `docs/04-memory/memory-architecture.md` — indexing destination
- `docs/06-tools/execution-priority.md`, `docs/06-tools/vision.md` —
  automation tiering this reuses
- `vision-everywhere.md` — the browser as one of several vision-capable
  surfaces
