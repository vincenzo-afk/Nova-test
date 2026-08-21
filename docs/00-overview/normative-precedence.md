# Normative Precedence

## Purpose

States which document wins when two documents in this repository appear
to conflict. This is the single most important document for an
implementing engineer or AI agent to read before writing code against
any ambiguity discovered between documents, since every other document
in this repository assumes this precedence order rather than restating
it.

## Scope

Conflict resolution between documents. This document does not resolve
conflicts within a single document — an internal contradiction in one
document is a defect in that document, to be fixed directly, not
resolved by precedence.

This order governs conflicts *among the specification documents*.
`docs/00-implementation-governance/ai-constitution.md` sits above all of
it as the process-level rule set (how an agent behaves when it
encounters a conflict, an ambiguity, or a gap at all) — see
`docs/00-implementation-governance/documentation-precedence.md` for how
the two relate.

## Precedence order (highest to lowest)

1. **`docs/00-overview/system-invariants.md`** — an invariant is never
   overridden by anything else in this repository; if any other document
   appears to permit violating an invariant, the invariant wins and the
   other document has a defect.
2. **`docs/15-decisions/` (Accepted ADRs)** — a ratified architectural
   decision overrides any component document that has not been updated
   to reflect it. An ADR is only superseded by a newer ADR explicitly
   marked as superseding it, never by an unrelated document.
3. **`docs/00-overview/non-goals.md` and `docs/01-product/project-scope.md`** — scope boundaries override any component
   document that implies broader scope than these establish.
   `docs/29-product/` extends and complements `docs/01-product/` (each
   of its documents says so explicitly, e.g. "Complements
   `docs/01-product/user-journeys.md`") but never expands scope beyond
   what `docs/01-product/` and `non-goals.md` establish — a
   `docs/29-product/` document is additional framing/detail, not a
   second, independent source of scope authority.
4. **`docs/02-architecture/` (system, runtime, and dependency
   architecture)** — structural architecture overrides individual
   component documents where they conflict on process topology, service
   boundaries, or dependency direction.
5. **Component specification documents** (`docs/03-runtime/` through `docs/09-ui/`, `docs/16-extensibility/`, `docs/17-workflow/`) — the
   detailed behavior of an individual component, authoritative for that
   component's own internals.
6. **`docs/08-api/schemas.md` and other wire-format schemas** — the
   literal external contract; if a component document's prose
   description of a payload differs from the schema, the schema is
   authoritative for wire format specifically, since it is what external
   consumers and other implementations actually integrate against.
7. **`docs/references/`, `docs/diagrams/`, `docs/26-system-reference/`** —
   supporting, illustrative, and consolidated-index material, never
   authoritative over anything above it. `docs/26-system-reference/` in
   particular exists to *index and cross-reference* the catalogs,
   tables, and events already specified elsewhere (see its own documents'
   "Where This Breaks" sections) — it does not originate new behavior. A
   diagram, table, or catalog entry in any of these locations that has
   drifted from its source document (a Tier 4/5 component specification,
   or a higher-precedence document above) is a defect in that diagram,
   table, or catalog, never a reason to change the source, and never
   grounds for treating the drifted copy as an open, unresolved question.

## How to use this when a conflict is found

1. Identify the two conflicting statements and which documents they
   appear in.
2. Apply the precedence order above to determine which one is correct.
3. **Do not silently follow the lower-precedence document.** File the
   conflict as a documentation defect (`docs/14-development/technical-debt.md`) and correct the lower-precedence document to
   match — implementing against a document known to conflict with a
   higher-precedence one reproduces the error into code. An implementation must not be built against the lower-precedence reading while the conflict is open.

## Example application

If `docs/06-tools/vision.md` (a component document) described vision
automation as available for any application, but
`docs/00-overview/non-goals.md` (scope) restricts it to an explicit
allow-list, `non-goals.md` wins — `vision.md` would have a defect
requiring correction, and an implementation must not be built against the
broader, incorrect reading.

## What this document does not do

It does not resolve ambiguity *within* the correct, higher-precedence
document — if `docs/00-overview/system-invariants.md` itself is unclear
about something, that is a gap in the invariants document to be filled
via an amendment or new ADR, not something this precedence order can
adjudicate.

## Related documents

- `docs/00-overview/system-invariants.md` — the highest-precedence
  content this order is built around
- `docs/15-decisions/` — ADRs, second in precedence
- `docs/14-development/technical-debt.md` — where discovered conflicts
  are tracked until resolved
