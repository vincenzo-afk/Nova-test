# Documentation Style Guide

## Purpose

States the writing and structural conventions every document in this
repository follows, and the metadata convention (status, owner, last
reviewed) applied going forward, so consistency is checkable rather than
merely aspirational.

## Scope

Writing conventions and document metadata. Naming conventions for
schemas and identifiers are `docs/14-development/naming-conventions.md`.

## Structural convention

Every document in this repository follows the same shape: Purpose,
Scope, body sections specific to the topic, and a closing "Related
documents" section — this is not a rigid template to fill mechanically,
but the consistent shape that makes the repository navigable, since a
reader unfamiliar with a specific document already knows where to look
for its cross-references.

## Writing conventions

- **No unmeasurable claims.** Words like "intelligent," "advanced," or
  "human-like" are not used to describe NOVA's own behavior unless
  immediately backed by a specific, measurable definition — per the
  consistency review already applied to this repository, this convention
  is already followed; new documents are checked against it the same way.
- **Cross-reference instead of re-explaining.** A concept already defined
  in its canonical document (e.g., risk tiers, defined in
  `docs/10-security/permissions.md`) is referenced by link, not
  re-explained in full in every document that uses it.
- **State the "why," not only the "what."** Consistent with this
  repository's existing style, a design decision is accompanied by its
  reasoning, not stated as a bare assertion.
- **Illustrative examples belong in prose; normative contracts belong in
  schemas.** A code-like JSON block in a document is a normative schema
  contributors must implement against; a narrative example (e.g., the
  "I like Python" / "I hate Python" example in
  `docs/04-memory/memory-conflict-resolution.md`) illustrates a rule
  without being the rule itself — keep these visually and structurally
  distinct so a reader does not mistake an illustration for a contract.

## Document metadata

Going forward, new and substantially revised documents carry a metadata
line beneath the title:

```markdown
# Document Title
_Status: Stable | Beta | Draft | Deprecated — Owner: <role/team> — Last reviewed: <date>_
```

- **Status** mirrors the maturity model in
  `docs/14-development/feature-flags.md`, applied to documentation
  itself rather than a shipped capability.
- **Owner** names the role or team responsible for keeping the document
  accurate (e.g., "Runtime" for `docs/03-runtime/` documents), not
  necessarily an individual.
- **Last reviewed** is updated whenever a document is substantively
  reviewed, whether or not content changed, so staleness is visible.

This metadata is applied going forward and opportunistically during
revision, consistent with the same non-retroactive-sweep approach used
for `docs/14-development/module-contract-standard.md` and `docs/14-development/naming-conventions.md` — it is not backfilled across
all 180+ existing documents in a single pass, since that would be a
purely cosmetic, high-risk-of-error bulk edit for a benefit for which
the "Related documents" section and repository structure already
substantially substitute.

## Anti-pattern documentation

Where a subsystem has known incorrect-implementation patterns worth
calling out explicitly, they are documented in
`docs/14-development/anti-patterns.md` rather than scattered as warnings
inside each subsystem's own document, keeping the "what not to do"
content in one place a contributor can scan before starting new work.

## Related documents

- `docs/14-development/naming-conventions.md` — schema and identifier
  naming, distinct from this document's writing/structure focus
- `docs/14-development/anti-patterns.md` — the consolidated
  incorrect-implementation reference
- `docs/14-development/feature-flags.md` — the maturity model this
  document's status metadata mirrors
