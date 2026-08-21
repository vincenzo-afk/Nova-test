# UI/UX Documentation Precision Plan

## Purpose

This document records the audit methodology applied to every UI/UX-adjacent
directory in this repository, what was found and fixed, and the standing
plan for keeping this area precise, accurate, and internally consistent
going forward. It exists because UI/UX documentation has a specific
failure mode the rest of the spec is less prone to: many small files
describing the same handful of concepts (a screen, a component, a token,
a flow) from different angles, which multiplies the chances of two
documents quietly drifting apart without either one being "wrong" on its
own.

## Scope covered

- `docs/09-ui/` — surface-specific behavior specs (Chat, Command Palette,
  Desktop, Graph Explorer, Memory Explorer, Overlay, Task Monitor, Tray,
  UI Overview) plus the product-semantic Design System
- `docs/30-design/` — the mechanical design-token system (color, spacing,
  typography, motion, dark mode, accessibility, and 20 more)
- `docs/31-user-flows/` — 14 end-to-end user journeys
- `docs/40-screens/` — 12 full-page screen specs
- `docs/41-components/` — 13 shared component specs
- `docs/42-design-qa/` — 6 QA/lint rule documents that enforce the tokens
  and rules above

## Audit method applied

1. **Duplicate-name collision check.** Any two files sharing a name or an
   obviously-overlapping topic across directories (`design-system.md`
   exists in both `09-ui/` and `30-design/`; `command-palette.md` exists
   in both `09-ui/` and `30-design/`; `overlay.md`/`overlays.md`) were
   read side by side and checked for (a) an explicit acknowledgment of
   the other's existence and division of concerns, and (b) any direct
   factual contradiction between them.
2. **Citation-accuracy check.** Every cross-reference from one UI/UX
   document into another (or into a non-UI document like
   `permission-manager.md` or `task-manager.md`) was checked against the
   target's actual content, not assumed accurate because the file name
   sounded right — this is the same method that found the majority of
   issues elsewhere in this audit.
3. **Reference-integrity check**, including bare directory references
   without a full `docs/...md` path (this specific format is what let
   two broken references slip past earlier, repo-wide passes).
4. **Numeric/scale consistency check** between a QA rule
   (`42-design-qa/`) and the token file it claims to enforce
   (`30-design/`) — QA rules that reference a "scale" or "minimum" the
   token file doesn't actually define are a real implementation-blocking
   gap, not a stylistic nitpick.
5. **State-vocabulary consistency check** between a component's display
   states (e.g., a workflow node's pending/running/success/failed/
   skipped badge) and the real backing state machine
   (`docs/03-runtime/task-manager.md`) — the same class of bug found
   repeatedly elsewhere in this audit (Task, Agent, Workspace, Tool,
   Provider, Plugin), so it was always going to be worth checking here
   too.

## What this pass found and fixed

- **A real behavioral contradiction**: `09-ui/design-system.md` said the
  app defaults to dark mode always; `30-design/dark-mode.md` said it
  follows the OS setting by default. Resolved in favor of the
  deliberate, persona-grounded decision (dark-mode-first); the other
  file was corrected to match.
- **Two broken references** using a bare-directory citation format that
  earlier full-repo scans hadn't covered: `30-design/design-system.md`
  pointed to a nonexistent `33-components/` (real: `41-components/`);
  `41-components/list.md` pointed to a nonexistent `35-performance`
  (real: `39-performance-budgets/`).
- **Two undeclared duplicate-name pairs** (`design-system.md`,
  `command-palette.md` across `09-ui/`/`30-design/`) given explicit
  cross-references stating which file owns which concern, so a reader
  or an implementing agent no longer has to guess whether the two are
  competing or complementary.
- **A missing type scale and line-height token**:
  `42-design-qa/typography-rules.md` enforced a "scale" and a line-height
  minimum that `30-design/typography.md` never actually defined. Added
  both to the token file.
- **A numeric inconsistency**:
  `45-code-perfection-failure-modes/09-ui-and-state-binding.md` referred
  to screens needing "five states" when the real screen template
  requires seven; reworded to be immune to the count drifting again.
- **An unresolved state-machine mapping**:
  `41-components/workflow-node.md`'s five display states were presented
  as if they were the real states, when the actual backing model is
  `task-manager.md`'s 11-state Task machine. Added an explicit mapping
  so the simplification is visible and intentional, not silently
  competing with the real source.
- **A genuine unresolved product decision**:
  `31-user-flows/plugin-flow.md` asserted that plugin permissions are
  granted individually rather than as a bundle, but the actual policy
  document (`16-extensibility/plugin-permissions.md`) never actually
  decided this. Resolved it explicitly (individual, scope-by-scope,
  with partial-grant-then-fail-at-invocation semantics) rather than
  leaving the UI flow doc as the only place asserting a behavior with
  no backing decision.

## Standing plan going forward

1. **Any new UI/UX document that duplicates or overlaps an existing
   one's apparent topic must state the division of labor explicitly**
   in its first paragraph — which one owns which concern — the same
   requirement already established for `docs/29-product/`'s relationship
   to `docs/01-product/` in `normative-precedence.md`.
2. **Any QA/lint rule (`42-design-qa/`) that references a scale, minimum,
   or enumerated set must cite the specific section of the token file
   that defines it**, and that section must actually exist before the
   QA rule is allowed to reference it — never the other way around.
3. **Any component whose display states are a simplification of a
   backing state machine elsewhere in the repository must say so
   explicitly**, with the mapping spelled out, rather than presenting a
   parallel vocabulary that could be mistaken for (or drift from) the
   real one.
4. **Bare directory references (`` `NN-name/` `` without a file or full
   `docs/` prefix) should be treated with the same scrutiny as full
   citations** in any future lint pass — this format is exactly what let
   two real broken references go undetected across multiple earlier,
   otherwise-thorough repo-wide reference checks in this same audit.
5. **A user-flow document's assertion of specific UX behavior (e.g.,
   "individually, not as a bundle") must trace to an actual decision in
   the relevant policy/architecture document**, not stand alone as the
   only place that behavior is claimed — if the flow doc is the first
   place a behavior is described, that's a signal the real policy
   document needs the decision added, not that the flow doc can just
   assert it.
