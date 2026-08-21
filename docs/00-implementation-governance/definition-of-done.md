# Definition of Done

## Purpose

The governance-layer entry point for "is this task actually done." The
full, canonical checklist lives at
`docs/43-ai-development/definition-of-done.md`; this file adds the
governance-specific criteria that checklist doesn't cover, and states
how the two relate.

## Scope

Every task, regardless of size, before it is marked complete.

## The full checklist

See `docs/43-ai-development/definition-of-done.md` for the complete,
binding checklist (acceptance criteria, failure-mode handling, model
router usage, memory write path, permission registration, schema
versioning, error catalog entries, state machine registration, tests,
docs, and review). Nothing in this file replaces any item there.

## Governance-specific additions

A task is not done unless, in addition to the checklist above:

- [ ] It contains no decision from `forbidden-decisions.md` made
      unilaterally.
- [ ] Every genuinely ambiguous point encountered was resolved per
      `ambiguity-policy.md` — either found in documentation (and cited)
      or escalated and answered, never assumed.
- [ ] It introduces no technology or pattern outside
      `technology-lock.md`, `architecture-lock.md`, and
      `canonical-patterns.md` without an accompanying ADR.
- [ ] It passes every applicable check in `quality-gates.md`.
- [ ] `implementation-checklist.md` has been walked in full, not
      sampled.
- [ ] If the task touched `docs/00-implementation-governance/` itself
      (a rule change), it was made deliberately, with a stated reason,
      not as a side effect of an unrelated change.

## A task that fails any box, in either checklist, is not done

This is stated once here for emphasis: "done" is not a subjective call,
and a fast, elegant, or seemingly-obviously-correct implementation that
skips a box is not done, per `ai-constitution.md`, Rule 9.
