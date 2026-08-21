# Code Generation Rules

## Purpose

The specific process an AI agent follows while generating code for this
repository — the governance-layer version of the AI Implementation
Protocol. `docs/43-ai-development/implementation-order.md` and `docs/43-ai-development/coding-guidelines.md` contain the full detail
this file summarizes into an enforceable sequence.

## Scope

Any code-generation task, from a single function to a full component
implementation.

## The four-phase process

### Phase 1: Understand

1. Read `ai-constitution.md` and this entire `docs/00-implementation-governance/` folder (once per session, not
   once per task, if governance files have changed since last read).
2. Read the target component's contract
   (`docs/26-system-reference/15-build-contracts.md`, or its own
   document).
3. Read `docs/00-overview/system-invariants.md` and `project-constraints.md`.
4. Read the relevant lifecycle/state machine
   (`docs/26-system-reference/16-lifecycle-and-state-machine-index.md`).
5. Build an internal map of what this change touches and what depends
   on it (`docs/43-ai-development/dependency-map.md`).

### Phase 2: Validate

Before writing any code, confirm:

- No contradiction exists between the contract and the current task
  (Constitution Rule 7 — if one exists, stop and report it).
- Every dependency this change needs is either already available or
  explicitly part of this task's scope.
- No undefined reference, unresolved API, or missing ownership exists
  for anything this change touches.
- If any of the above fails, this is an `ambiguity-policy.md` trigger,
  not a reason to proceed with a best guess.

### Phase 3: Implement

For the feature or fix:

1. Read its contract (again, freshly, not from memory of Phase 1).
2. Read its dependencies' contracts.
3. Read the applicable invariants and constraints.
4. Implement, following `implementation-rules.md` and `canonical-patterns.md`.5. Write tests per `docs/12-testing/testing-strategy.md`.
6. Verify against the specification —
   `docs/05-ai/verification-and-stop-conditions.md`'s pipeline.

### Phase 4: Self-Review

Before marking anything complete, answer, honestly, in writing:

- Did I introduce a new dependency not already declared?
- Did I violate an invariant or a project constraint?
- Did I add undocumented behavior?
- Did I assume anything not stated in the documentation?
- Did I bypass an ownership rule (`docs/26-system-reference/05-data-ownership.md`)?
- Did I skip any required test?
- Does the implementation exactly match the contract — not "close
  enough," exactly?

**If any answer is "yes," the change is revised before it is considered
for completion.** This is not optional and is not satisfied by noting
the discrepancy in a comment and moving on.

## Relationship to Definition of Done and Quality Gates

Passing Phase 4 is necessary but not sufficient — `definition-of-done.md`
states the full completion criteria, and `quality-gates.md` states the
automated and human checks a change passes through regardless of how
confident the Phase 4 self-review was.
