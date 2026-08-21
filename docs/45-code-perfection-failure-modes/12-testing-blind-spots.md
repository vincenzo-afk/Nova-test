# Landmines: Testing Blind Spots


## Where this breaks

1. **Tests only cover the happy path documented in the feature request**,
   not the failure modes documented in this directory — a PR is not
   adequately tested if its test file doesn't have at least one test per
   applicable landmine above.
2. **Mocking the Model Router's response instead of testing against the
   deterministic-first decision logic** — this can hide bugs where a
   task that must never reach the LLM (a deterministic case) is
   incorrectly routed to it, because the mock always "succeeds."
3. **Integration tests that share mutable fixture state across tests**,
   producing order-dependent test failures that look flaky but are
   actually a real concurrency bug in disguise.
4. **Chaos/failure-injection tests skipped for "this is just a small
   change"** — small changes to high fan-in components
   (`docs/43-ai-development/dependency-map.md`) are exactly where chaos tests
   (`docs/12-testing/chaos-tests.md`) catch the most.
5. **No test for the specific idempotency/retry-safety of a new
   side-effecting tool or workflow step** — if a step sends an email or
   creates a calendar event, there must be an explicit test asserting
   that re-running it (simulating a retry) does not duplicate the effect.
6. **Snapshot/golden tests over LLM output** treated as pass/fail on
   exact text match — LLM output is nondeterministic by nature; tests
   must assert on structural/semantic properties (schema validity,
   presence of required fields, absence of PII) not exact string equality.
