# Allowed Decisions (AI MAY Decide)

## Purpose

The Optional-class decisions from `decision-authority-matrix.md`,
expanded into a scannable list — the areas where an AI implementer can
move without checking in, because the choice has no cross-cutting
consequence and cannot violate a contract, invariant, or constraint no
matter which reasonable option is picked.

## Scope

Build-time implementation choices only. This is not a grant of runtime
autonomy for NOVA itself — that is governed separately by
`docs/23-autonomy/`.

## The list

- **Variable, parameter, and local-scope naming** — within
  `docs/14-development/naming-conventions.md`'s conventions.
- **Internal helper-method decomposition and private function
  structure** — as long as the public contract
  (`docs/26-system-reference/15-build-contracts.md`) is unaffected.
- **Test data values and fixture content** — within the shape a test
  actually requires per `docs/12-testing/testing-strategy.md`.
- **Micro-optimizations that do not change observable behavior** — loop
  restructuring, memoization of a pure function, short-circuiting —
  subject to the Constitution's Rule 6 (no behavior change).
- **Refactoring that is strictly behavior-preserving** and covered by
  existing tests before and after the change.
- **Code comments and inline documentation wording** — content, not
  presence; whether a public API needs a doc comment at all is not
  optional (`docs/14-development/documentation-style-guide.md`).
- **The specific wording of a log message** — within the required
  fields (correlation ID, error code) from
  `docs/14-development/error-handling-tagging-and-performance-rules.md`.
- **Internal file layout within a module** the AI owns end-to-end, as
  long as it doesn't cross the top-level directory boundaries fixed in
  `technology-lock.md`.
- **Choice of a specific test case or scenario** to cover a required
  acceptance criterion, when more than one valid scenario would satisfy
  it.

## What "allowed" does not mean

Allowed does not mean unreviewed — every change, Optional-class or not,
still passes through `quality-gates.md` and `implementation-checklist.md` before being considered complete. It means
the AI agent does not need to pause and ask before making the choice in
the first place.

## When in doubt

If a specific decision doesn't clearly map to an item on this list, it
is not on this list — see `decision-authority-matrix.md`'s default rule
and `ambiguity-policy.md`.
