# Documentation Anti-Patterns

## Purpose

Catalogs recurring patterns of *documentation* defect found during this
specification's own hardening audit — as distinct from
`docs/14-development/anti-patterns.md`'s *code-implementation*
anti-patterns. This file is about mistakes an AI agent (or a human)
makes while writing or maintaining the specification itself; that file
is about mistakes made implementing against it. Read both — an agent
asked to update documentation is exactly as capable of introducing these
patterns as one asked to write code is capable of the other file's
patterns.

## Why this file exists

Every entry below was found at least once, for real, during this
specification's hardening process — not a hypothetical list. They are
ordered roughly by how often each pattern recurred.

## 1. Inventing a state machine instead of finding the real one

**The pattern:** A document needs to summarize an entity's lifecycle
(Task, Agent, Workspace, Tool, Provider, Plugin, Device — six real
examples found), and rather than reading the entity's actual owning
document, a plausible-sounding state machine is written from general
software-engineering intuition (`Discovered → Installed → Loaded →
Running → Suspended → Unloaded → Removed` was invented for Plugin, when
the real states were `Installed → Enabled ⇄ Disabled → Updating →
Uninstalled`). The invented version reads as confidently as the real
one, which is exactly what makes it dangerous.

**The fix:** Before writing any state list, find the one document that
explicitly owns that entity's lifecycle and copy its exact state names.
If no such document exists, that is itself a finding to report — not
license to invent one. `docs/26-system-reference/16-lifecycle-and-state-machine-index.md`'s "Rule for new objects" exists precisely to force this.

## 2. A citation that names a real file but not real content

**The pattern:** A failure-mode mitigation or a cross-reference cites a
real, existing document — but that document doesn't actually contain
the mechanism being claimed (found repeatedly: a citation to
`system-invariants.md` for goal-drift re-anchoring, which isn't one of
its invariants; a citation to a security-policy document for a
completely different runtime mechanism; a citation to `internal-api.md`
for a "loopback binding" it never describes). This is more dangerous
than a broken link, because a broken link fails loudly and a wrong
citation looks correct at a glance.

**The fix:** Before trusting a citation, open the cited document and
search for the specific mechanism being claimed — not just confirm the
file exists. If the mechanism genuinely isn't there, either the citation
is wrong (find the real source) or the mechanism itself is missing and
needs to be written, grounded in something already established
elsewhere — never left as an unverified assumption.

## 3. A "must be read alongside" list that's stale relative to the directory it claims to cover

**The pattern:** A catalog file lists which documents it covers, but new
documents were added to that directory later and never added to the
list (found across nearly every failure-mode file in
`docs/25-failure-modes/` — dozens of components with zero back-
reference to their applicable catalog entry).

**The fix:** When adding a new document to a directory that has a
"covers these files" list elsewhere, add it to that list in the same
change — this is the same atomic-update discipline as
`docs/26-system-reference/20-versioning-contracts.md`'s checklist,
applied to documentation structure instead of code.

## 4. A boilerplate cross-reference copy-pasted across many files, true for few of them

**The pattern:** A templated sentence ("see the corresponding file in
X/") gets copied across every file in a directory during initial
authoring, and remains even for the majority of files where no
corresponding file actually exists (found across 21 of 22 files in
`docs/36-failure-catalog/`, most of which pointed to a nonexistent
same-named file in a directory organized by different, broader
categories).

**The fix:** A templated sentence referencing another file by an implied
name/mapping must be verified per-instance, not trusted because it was
true for the first file the template was written for.

## 5. Presenting a simplified value set as if it were the authoritative one

**The pattern:** A UI component or summary document defines a small,
convenient set of display values (e.g., a workflow node's
pending/running/success/failed/skipped badge) without stating that
these are a simplification of a richer, real backing model (the actual
11-state Task machine) — leaving a reader unable to tell whether this is
a deliberate UI simplification or a second, competing definition.

**The fix:** Any simplified vocabulary must explicitly say so, with the
mapping to the real states spelled out, per this pattern's fix in
`docs/41-components/workflow-node.md`.

## 6. Fabricated numeric precision

**The pattern:** A specific-looking number is written for a
configuration default, a timing budget, or a coefficient with no real
basis — because a number looks more authoritative than a qualitative
description, even when no real value has actually been decided yet
(found in an illustrative config example presenting ~25 unbacked values
as equally authoritative alongside 11 real, schema-established ones).

**The fix:** A value that hasn't actually been decided is marked
explicitly as such (`[illustrative]`, `IMPLEMENTATION-DEFINED`, or
equivalent) rather than given a specific-looking number that implies a
real decision was made. See `docs/04-memory/memory-confidence.md`'s
explicit non-fabrication rule, and
`docs/26-system-reference/08-configuration-reference.md`'s tagging
scheme.

## 7. Two documents on the same topic, neither acknowledging the other

**The pattern:** Two files with the same or overlapping name/topic exist
in different directories (`design-system.md` in two places,
`command-palette.md` in two places), each written as if it were the only
document on the subject, with no statement of which owns which concern —
leaving both a reader and an AI agent unable to tell whether they're
complementary or contradictory without reading both closely (and in one
case, they directly contradicted each other on the app's default theme).

**The fix:** Any new document whose topic plausibly overlaps an existing
one must state the division of labor explicitly, in its first
paragraph — the same requirement `docs/00-overview/normative-precedence.md` already established for `docs/29-product/` relative to
`docs/01-product/`.

## 8. Missing schema fields that a cited mechanism actually depends on

**The pattern:** A failure-mode mitigation describes checking a field
(idempotency, a version number, an identity scope) that the actual
target schema never declared — the citation and the mitigation logic
are both reasonable, but the field they depend on simply doesn't exist
yet anywhere in the specification.

**The fix:** When a mitigation or rule depends on a specific field
existing, verify it's actually declared in the schema it depends on —
and if it isn't, add it there (grounded in the surrounding contract, not
invented from nothing), not just in the place that assumes it.

## Related documents

- `docs/14-development/anti-patterns.md` — the code-implementation
  counterpart to this file
- `docs/00-implementation-governance/ai-constitution.md` — Rule 7 (stop
  and report documentation conflicts) is the standing policy these
  patterns exist to help an agent recognize before it needs to invoke
  that rule
- `docs/25-failure-modes/FM-24-documentation-and-reference-integrity.md`
  — the failure-mode catalog entry for documentation drift generally
