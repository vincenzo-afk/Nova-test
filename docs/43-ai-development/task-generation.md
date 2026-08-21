# Task Generation — Turning a Doc Into Tickets


## Purpose

How to decompose a NOVA spec document into implementable units of work
without losing the invariants the doc defines.

## Method

1. **Extract every "must", "never", "always" sentence from the source
   doc first**, before extracting features. These become acceptance
   criteria, not optional polish — see `acceptance-criteria.md`.
2. **One task = one testable behavior**, not one file. A task like
   "implement memory storage" is too large to verify; "implement
   append-only write path for episodic-tier memory with versioning" is
   right-sized.
3. **Every task that touches a high fan-in component
   (`docs/02-architecture/dependency-map.md`) gets an explicit "consumers affected" field**
   listing every other doc/component that depends on the interface being
   touched.
4. **Every task references the failure modes it must handle.** Pull the
   relevant entries from `25-failure-modes/` and `45-code-perfection-failure-modes/` for the subsystem and attach them
   to the ticket — do not leave failure handling as implicit.
5. **Order tasks by `implementation-order.md`**, not by convenience or
   by which task "sounds easiest." A UI task that depends on an
   unimplemented Planner output is blocked, not parallelizable.
6. **Every task states its Definition of Done by reference**
   (`definition-of-done.md`), not by restating it — DoD drift between
   tickets is a common source of inconsistent quality bars.

## Anti-patterns to avoid when generating tasks

- Splitting a task by file instead of by behavior (produces
  compile-but-doesn't-work intermediate states).
- Generating a task for a feature doc without generating a matching task
  for its failure-mode doc.
- Writing "handle errors appropriately" as an acceptance criterion instead
  of enumerating the specific errors from `docs/26-system-reference/06-error-catalog.md`.
- Generating UI tasks before the data contract they render is finalized.
