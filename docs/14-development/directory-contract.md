# Directory Contract

## Purpose

Where a **new** documentation file belongs — which numbered top-level
directory, and when a genuinely new one is warranted. This is the
forward-looking counterpart to `docs/26-system-reference/
21-canonical-doc-index.md`, which answers "where does concept X already
live"; this file answers "where should a not-yet-written file go."
Absorbs what would otherwise be a separate `file-placement-rules.md` —
the two questions are one decision, not two.

## Scope

Top-level directory selection and new-directory justification. Naming
of the file itself (once its directory is chosen) is
`docs/14-development/naming-conventions.md`.

## The numbering is chronological-by-topic-area, not hierarchical

NOVA's `docs/` numbering (`00-overview`, `01-product`, `02-architecture`,
... through `48-incident-response`) reflects the order topic areas were
established, not a strict dependency or importance ordering — later
numbers are not "less important," and a new file about, say, security
does not need to squeeze into `10-security`'s exact numeric neighborhood
if `10-security` doesn't fit; NOVA already has precedent for a topic
area gaining a second, later directory when it outgrew its first
(`01-product` and `29-product`; `09-ui` and `30-design`) — always
cross-referenced explicitly when this happens, per
`00-implementation-governance/documentation-precedence.md`.

## Decision procedure for a new file

1. **Does an existing directory already own this topic area?** Check
   `docs/26-system-reference/21-canonical-doc-index.md` first — if the
   topic is a natural extension of an existing canonical document
   (e.g., a new failure mode belongs in `25-failure-modes/`, a new
   screen spec in `40-screens/`), the file goes there. This is the
   common case.
2. **Does the topic exist but the natural directory is a poor fit
   (near-full, or a strong scope mismatch)?** Create a new, later-
   numbered directory for it (following the `01-product` /
   `29-product` precedent) rather than forcing an awkward fit — but the
   new directory's first file must explicitly state its relationship to
   the original (extends / complements / distinct-from), per the
   accessibility.md and use-cases.md precedents already established in
   this repository.
3. **Is this a genuinely new topic area with no existing home?** A new
   top-level directory is warranted only when the content doesn't
   reduce to a subsection of an existing one — e.g., `44-product-design-
   failure-cases` and `45-code-perfection-failure-modes` were each
   justified as distinct from `25-failure-modes` because their content
   (design-critique cases; code-review-pattern cases) is categorically
   different from a runtime failure mode, not merely a different
   severity or format of the same thing.
4. **Update the index.** Any new canonical document is added to
   `21-canonical-doc-index.md` in the same change — a file that exists
   but isn't indexed is undiscoverable by the very mechanism meant to
   prevent duplicate/conflicting documents (the duplicate-filename
   defect class this repository's audit history has repeatedly found
   and fixed).

## What this file does not decide

Whether the *content itself* should exist at all — that's a product/
governance judgment call, not a placement one. This file assumes the
decision to write something has already been made.

## Related documents

- `docs/26-system-reference/21-canonical-doc-index.md` — the backward-looking lookup this file complements
- `docs/14-development/naming-conventions.md` — naming the file once its directory is chosen
- `docs/00-implementation-governance/documentation-precedence.md` — precedence rules when two directories' content overlaps
