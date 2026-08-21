# Success Metrics

## Purpose

Defines, precisely, what "this task succeeded" and "this system works"
mean for NOVA — replacing subjective judgment with a specific, testable
score. This exists because open-ended agentic action on a live desktop
has no fixed benchmark to test against, so the definition of success has
to be built into the system itself.

## Scope

Applies to every executed task from Phase 2 onward. Phase 1 (read-only)
is measured on retrieval accuracy, not task success, since no action is
taken.

## Task Success Score

A task is scored as successful only when all of the following hold:

1. **Goal achieved** — the state described by the user's request is
   actually true after execution, not merely attempted.
2. **Verification passed** — the Verifier confirmed the outcome using
   ground-truth signals wherever available (see
   `docs/03-runtime/verifier.md`, Tier 2). A task with no verifiable
   signal is scored as **unverified**, which is a distinct, non-success
   outcome — never conflated with success.
3. **No rollback occurred** — an action that had to be undone, even if the
   undo itself succeeded, does not count as a success for scoring
   purposes; it is scored as a recovered failure.
4. **User approval given, where required** — for any action at a risk
   tier requiring confirmation, explicit approval must have been given;
   an action that proceeded without required confirmation is a defect,
   not a success, regardless of outcome.
5. **Minimal unnecessary actions** — a task that achieved its goal via
   more steps, tool calls, or LLM invocations than the deterministic-first
   principle would predict is flagged for review even if it technically
   succeeded, since this indicates the Planner failed to prefer the
   cheaper, more predictable path.

## Definition of failure

A task fails when the goal is not achieved, OR verification cannot confirm
it was achieved, OR the system state does not match the expected outcome.
There is no partial-credit "probably fine" outcome — ambiguity here
defaults to failure/unverified, not success, because a false-positive
success is worse than a visible failure (see
`docs/03-runtime/verifier.md`, Tier 2, for the reasoning).

## Retrieval accuracy (Phase 1 metric)

For read-only question-answering, success is measured as: the answer is
grounded in actual retrieved memory/graph data (not model speculation),
and the specific fact requested is present and correctly attributed. This
is tracked separately from the Task Success Score because no action or
verification step is involved.

## System-level success indicators

Beyond individual task scoring, the system as a whole is evaluated on:

- The proportion of tasks resolved without any LLM call (tracks
  Deterministic Before Intelligent adherence — must not decrease as new
  tools are added, per `docs/00-overview/goals.md`).
- The proportion of tasks that reach "unverified" rather than a false
  "success" (must trend toward zero, not be hidden by counting
  unverified as success).
- Time-to-recovery for tasks that fail partway through (Journey 3 in
  `user-journeys.md`).

## Related documents

- `docs/00-overview/goals.md` — the phase-by-phase targets this scoring
  applies to
- `docs/03-runtime/verifier.md` — how verification evidence is actually
  gathered (Tier 2)
- `use-cases.md` — the concrete tasks this scoring is applied to
