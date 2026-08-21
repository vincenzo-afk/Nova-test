# FM-08: Code Generation & Testing

## Purpose

Failures specific to NOVA generating and validating software artifacts on the user's behalf — from syntax errors to a test suite that gives false confidence.

## Scope & Related Documents

This file is part of `docs/25-failure-modes/`, the project-wide failure-mode catalog. It must be read alongside:

- `docs/12-testing/testing-strategy.md` - `docs/12-testing/unit-tests.md` - `docs/12-testing/integration-tests.md` - `docs/12-testing/e2e-tests.md` - `docs/12-testing/chaos-tests.md` - `docs/12-testing/simulation-tests.md` - `docs/12-testing/validation.md` - `docs/12-testing/benchmarks.md`

## Failure Catalog

Each failure is assigned a stable ID (`FM-08-0XX`) for cross-referencing from code comments, incident reports, and other failure-mode files.

| ID | Failure | Trigger Condition | Detection | Severity | Mitigation (prevent) | Recovery (respond) |
|---|---|---|---|---|---|---|
| **FM-08-001** | Code does not compile | Syntax error, missing import, or type error in generated code. | Compiler/interpreter invocation fails before execution. | Medium | Compile/lint-check generated code before presenting it as done, as a mandatory pipeline step, not optional. | Feed the compiler error back into the model for a targeted fix-and-retry loop, bounded by a max-attempt count. |
| **FM-08-002** | Syntax errors | Subset of 001, called out separately since some languages fail fast here specifically. | Parser error at a specific line/column. | Medium | Same as 001. | Same as 001; include the exact error location in the retry prompt. |
| **FM-08-003** | Runtime crash | Code compiles but throws an unhandled exception during execution. | Non-zero exit / unhandled exception in sandboxed test run. | Medium | Always execute generated code in a sandbox (FM-12) with a smoke test before declaring it done. | Capture the stack trace, feed it back for a targeted fix, re-run the smoke test. |
| **FM-08-004** | Infinite recursion | Missing or incorrect base case in generated recursive logic. | Stack overflow, or execution time/step count exceeds a sane ceiling in the sandbox run. | Medium | Static complexity/recursion-depth lint pass, plus a hard execution-time ceiling in the test sandbox. | Fix the base case explicitly; regenerate with the bug pattern flagged to avoid repeating it. |
| **FM-08-005** | Memory leaks (generated code) | Generated code holds references longer than necessary (e.g. unclosed handles, growing caches with no eviction). | Sandbox run shows memory growth over a sustained synthetic load test. | Low | Include a resource-cleanup checklist in the code-review/lint pass for languages prone to this. | Patch the specific leak; add a regression test that exercises the leak scenario. |
| **FM-08-006** | Wrong imports | Generated code imports a package that doesn't exist, is misspelled, or is the wrong package for the intended function. | Import resolution fails at compile/build time. | Medium | Cross-check imports against the actual installed/available package registry before finalizing generation. | Correct the import path/package name and retry the compile step. |
| **FM-08-007** | Wrong package versions | Generated code assumes an API surface from a package version different than what's actually installed. | Runtime error referencing a missing method/attribute that exists in a different package version. | Medium | Pin and expose the actual installed package versions to the generation context, per `docs/43-ai-development/context-generation.md`'s dependency-version context requirement. | Regenerate against the actual installed version's real API surface, not a remembered/assumed one. |
| **FM-08-008** | Wrong framework | Generated code assumes a framework/library the project doesn't actually use. | Generated file references framework-specific patterns absent from the rest of the codebase. | Low | Ground code generation in the actual project structure/dependencies, per `docs/43-ai-development/context-generation.md`'s dependency-version context requirement, not general training knowledge alone. | Regenerate using the project's actual stack, explicitly supplied in context. |
| **FM-08-009** | Security vulnerabilities (generated code) | Generated code introduces a known-bad pattern (SQL string concatenation, hardcoded secret, missing input validation). | Static security lint (SAST) flags the pattern. | High | Mandatory SAST pass on all generated code before it's presented as complete, per `docs/12-testing/testing-strategy.md`'s Static security analysis on generated code section. | Block delivery until the vulnerability is fixed; never treat a security lint failure as a soft warning for generated code. |
| **FM-08-010** | Tests incorrect | Generated test asserts the wrong expected value, or tests the wrong behavior entirely. | Test passes against clearly-broken implementation, or fails against clearly-correct implementation (mutation testing catches this). | Medium | Mutation testing / cross-check that tests actually fail when the implementation is deliberately broken. | Regenerate the test from the spec, not from the implementation (to avoid tautological tests). |
| **FM-08-011** | Tests miss bugs | Coverage gap — an important branch/edge case isn't exercised. | Coverage report shows an uncovered branch that later correlates with a reported bug. | Medium | Coverage-driven test generation targeting branches, not just lines, per `docs/12-testing/testing-strategy.md`. | Add a targeted regression test reproducing the missed case. |
| **FM-08-012** | False positives (tests) | Test fails due to test-code bugs or environment issues, not an actual implementation problem. | Test failure doesn't reproduce when investigated manually / implementation is verifiably correct. | Low | Keep test code itself under the same quality bar (review/lint) as production code. | Fix the test, not the implementation; track false-positive rate as a test-suite health metric. |
| **FM-08-013** | False negatives (tests) | Test passes despite the implementation being wrong (weak assertions, or testing the mock instead of real behavior). | Bug reaches later stage (Verifier, user) despite a green test suite. | High | Mutation testing to catch weak assertions; avoid over-mocking the exact behavior under test. | Strengthen the specific assertion; add the missed scenario as a new explicit test case. |
| **FM-08-014** | Flaky tests | Test result depends on timing, ordering, or external state rather than being deterministic. | Same test/commit produces different pass/fail results across repeated runs. | Medium | Isolate tests from real time/network/shared state; use fakes/fixed clocks per `docs/12-testing/unit-tests.md`. | Quarantine the flaky test from the required-to-pass gate until fixed; never let flakes silently reduce trust in the whole suite. |
| **FM-08-015** | Wrong environment (tests) | Tests run against a different environment configuration than production (e.g. different dependency versions). | Test passes in CI/sandbox but the same code fails once deployed. | Medium | Environment parity between test sandbox and target deployment environment, per `docs/12-testing/testing-strategy.md`'s Test/production environment parity section. | Reproduce the target environment more faithfully in the test sandbox; re-run before trusting the result. |
| **FM-08-016** | Mock failures | Mocked dependency behaves unlike the real dependency, masking an integration bug. | Integration/e2e test against the real dependency fails despite unit tests (with mocks) passing. | Medium | Contract tests against the real dependency's actual interface, in addition to unit tests with mocks. | Update the mock to match the real contract; add the missed integration scenario as an e2e test. |

## Compounding Failures

Notes on how failures in this file interact with failures elsewhere in this catalog — read these before assuming a bug is isolated to one subsystem.

- Flaky tests (FM-08-020) and a CI/CD pipeline with no flake-quarantine policy compound into a team/agent that starts ignoring test failures altogether — treat flake-rate as a first-class metric, not noise.

## Severity Legend

- **Critical** — data loss, security compromise, or user-visible harm; requires an incident-response runbook, not just a bug ticket.
- **High** — silent incorrectness, significant user-visible breakage, or a failure that blocks task completion with no graceful degradation.
- **Medium** — degraded quality/UX or a failure with a working but imperfect fallback.
- **Low** — cosmetic, rare, or fully recoverable with negligible user impact.
