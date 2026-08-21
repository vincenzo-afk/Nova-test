# Bibliography

## Purpose

Lists the categories of external reference material relevant to NOVA's
architecture, for contributors who want to study the background of a
specific decision in more depth than `research.md` and `inspirations.md`
provide inline.

## Scope

Reference categories, not a citation list for specific claims made
elsewhere in this repository — those claims are self-contained
architectural decisions justified on their own terms within their owning
documents.

## Reference categories

- **Model Context Protocol specification** — the protocol NOVA's MCP
  execution tier (`docs/06-tools/mcp.md`) implements against; consult the
  current official MCP specification directly, since it is an external,
  independently versioned standard NOVA tracks rather than owns.
- **Windows UI Automation and Accessibility documentation** — the
  official Microsoft documentation for the accessibility-tree APIs
  referenced in `docs/06-tools/accessibility.md`; consult current
  Microsoft developer documentation directly, since API surface details
  are maintained externally.
- **Agent memory and retrieval-augmented generation literature** — the
  broader research area informing `docs/04-memory/`'s tiered-memory and
  retrieval-fusion design, per the open-problems framing in
  `research.md`.
- **Robotic process automation industry practice** — the operational
  lessons around UI-automation brittleness and maintenance burden
  informing the scoping decisions in `docs/06-tools/vision.md` and `docs/00-overview/non-goals.md`.
- **Prompt injection and LLM security research** — the ongoing security
  research area informing the threat model in
  `docs/10-security/threat-model.md`.

## Why this document does not include specific citations

Given how quickly official specifications (MCP), platform documentation
(Windows Accessibility APIs), and security research in this space evolve,
this document intentionally points to categories and their authoritative,
externally-maintained sources rather than pinning specific dated
citations that would become stale — contributors implementing against
any of the categories above should consult the current, official source
for that category directly rather than relying on a snapshot recorded
here.

## Related documents

- `research.md` — the open problems these reference categories relate to
- `inspirations.md` — how these influences shaped specific NOVA design
  choices
- `comparisons.md` — categorical comparison against adjacent tool types
  informed by this material
