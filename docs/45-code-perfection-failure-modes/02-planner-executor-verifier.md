# Landmines: Planner / Executor / Verifier


## Where this breaks

1. **Planner emits a step the Executor has no registered handler for.**
   Without a hard validation step between planning and execution, this
   fails deep inside the executor with a confusing stack trace instead of
   a clear "unknown step type" error at the planning boundary.
2. **Executor treats a Verifier failure as a terminal error instead of a
   signal to re-plan.** The whole point of the Observe→Remember→Reason→Act→Verify
   loop is that Verify failures feed back into Planning; swallowing them
   as a hard failure defeats the architecture's self-correction.
3. **Deterministic-first check is implemented as a single boolean flag
   checked once at plan time**, instead of being re-evaluated per step —
   a multi-step plan can have some steps that are deterministic and some
   that genuinely need an LLM; conflating them either wastes model calls
   or produces unverified guesses where determinism was available.
4. **Step retries re-run non-idempotent side effects.** If step 3 of 5
   sends an email and step 4 fails, a naive retry-from-failure re-sends
   the email. Every step needs an idempotency key checked before
   re-execution, per `docs/03-runtime/failure-recovery.md`.
5. **Partial plan execution leaves world-model state inconsistent** —
   e.g., Executor marks a task "in progress" but a crash before the
   Verifier runs leaves it stuck there forever with no recovery sweep. Any
   status field needs a documented recovery/timeout path in
   `docs/26-system-reference/04-state-transition-tables.md`.
6. **Planner context assembly silently truncates history to fit a token
   budget** without the Planner knowing truncation happened, causing it
   to reason with the assumption it has full context when it doesn't
   — always surface truncation as an explicit signal to the reasoning
   step.
7. **Verifier checks the LLM's own stated confidence instead of an
   independent check.** Asking the model "are you sure?" is not
   verification; `verifier.md` requires an independent, ideally
   deterministic check of the actual outcome (file exists, API returned
   200, calendar event was created) — never accept self-report as proof.
8. **Executor logs the plan but not the actual tool arguments used**,
   making post-hoc debugging of "why did it do that" impossible when the
   Planner's intent and the Executor's literal call diverge due to a
   parameter-mapping bug.
