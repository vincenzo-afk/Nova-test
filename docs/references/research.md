# Research Context

## Purpose

Documents the broader technical landscape NOVA's architectural decisions
were made in light of — the active research problems this project
inherits rather than solves outright, so future contributors understand
which parts of this specification represent settled engineering and which
represent NOVA's specific position on a genuinely open problem.

## Scope

Contextual research grounding for major architectural decisions. Specific
product comparisons are `comparisons.md`; direct influences on design
choices are `inspirations.md`.

## Open problems this project takes a position on, rather than solves

- **Agent memory at scale** — maintaining a coherent, fast-retrieving
  memory system over months or years of continuous use is an active
  research area industry-wide; NOVA's fixed-schema Knowledge Graph plus
  tiered memory (`docs/04-memory/memory-architecture.md`,
  ADR-0002) is a specific, considered position (favoring consistency and
  predictability over maximal schema flexibility), not a claim that this
  is a definitively solved problem.
- **Reliable computer-use / GUI automation** — vision-guided desktop
  control remains an area of active work at multiple AI labs and RPA
  vendors; NOVA's response is architectural containment (a narrow
  allow-list, last-resort priority, mandatory confirmation for
  destructive actions — `docs/06-tools/vision.md`, ADR-0005) rather than
  a claim of having solved GUI automation reliability itself.
- **Prompt injection defense** — an open, industry-wide problem; NOVA's
  structural content/instruction separation
  (`docs/05-ai/prompt-system.md`, ADR-0006) is a mitigation reducing a
  specific failure mode (content redirecting tool selection), explicitly
  documented in `docs/10-security/threat-model.md` as not eliminating the
  broader risk category entirely.

## Why this document exists

Naming these as open problems, rather than presenting NOVA's mitigations
as complete solutions, is intentional — a future contributor evaluating
whether to relax one of these constraints (e.g., allowing broader GUI
automation, or a more flexible knowledge graph schema) should understand
they would be reopening a genuinely unresolved industry problem, not
merely relaxing an arbitrary internal restriction.

## Related documents

- `docs/04-memory/memory-architecture.md`, `docs/06-tools/vision.md`,
  `docs/05-ai/prompt-system.md` — the specific architectural positions
  referenced above
- `docs/10-security/threat-model.md` — the honest residual-risk framing
  this document's approach is consistent with
