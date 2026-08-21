# Implementation Checklist

## Purpose

The step-by-step walkthrough an AI agent (or human) follows for a single
task, tying together the governance folder, the AI Implementation
Protocol, and the existing per-layer checklists
(`docs/14-development/module-checklist.md`,
`docs/43-ai-development/coding-checklist.md`,
`docs/43-ai-development/review-checklist.md`) into one ordered list. It
does not replace those three — it sequences them.

## Scope

Any implementation task, from a single function to a full component.

## The checklist

### Before starting

- [ ] Read `ai-constitution.md` (if not already read this session).
- [ ] Read the target component's contract
      (`docs/26-system-reference/15-build-contracts.md` or its own doc).
- [ ] Confirm the task is in scope (`project-constraints.md`).
- [ ] Confirm every technology and pattern the task will need is already
      locked/allowed (`technology-lock.md`, `architecture-lock.md`,
      `canonical-patterns.md`); if not, this is an
      `ambiguity-policy.md` trigger before writing anything.

### While implementing

- [ ] Follow `code-generation-rules.md`'s four phases in order —
      Understand, Validate, Implement, Self-Review.
- [ ] Apply `implementation-rules.md`'s Required list; avoid everything
      on its Forbidden list.
- [ ] Use only patterns from `canonical-patterns.md`.
- [ ] Any decision encountered mid-implementation is checked against
      `decision-authority-matrix.md` before being made — Optional,
      proceed; anything else, per `ambiguity-policy.md`.
- [ ] Complete `docs/14-development/module-checklist.md` for the
      module(s) touched.
- [ ] Complete `docs/43-ai-development/coding-checklist.md`.

### Before marking complete

- [ ] Every box in `definition-of-done.md` (both the linked full
      checklist and this folder's additions) is checked, not assumed.
- [ ] Every gate in `quality-gates.md` passes.
- [ ] `docs/43-ai-development/review-checklist.md` is complete.
- [ ] Documentation is updated in the same change if implementation
      diverged from spec (`ai-constitution.md`, Rule 1).
- [ ] If a new decision was made that should be locked for future tasks
      (a new library, a new pattern), it is proposed as an ADR
      (`docs/15-decisions/`) rather than left as an unstated precedent.

### After completion

- [ ] If this task revealed a gap in `docs/00-implementation-governance/`
      itself (an undocumented decision class, a missing edge case), that
      gap is filed — not left for the next task to rediscover the same
      ambiguity from scratch.

## A checklist item skipped "because it obviously doesn't apply"

Still gets marked explicitly not-applicable with a one-line reason, not
silently omitted — the difference matters for anyone reviewing the
change later without the context the implementer had in the moment.
