# Simulation Tests

## Purpose

Addresses the specific testing challenge this project's foundational
review identified as unresolved by conventional testing alone: how do you
regression-test an agent whose real environment is the user's own live,
mutating desktop, which cannot be fully captured by a fixed set of clean
end-to-end fixtures.

## Scope

Replay-based and recorded-scenario testing. Clean, controlled end-to-end
scenarios are `e2e-tests.md`.

## Simulation testing components

- **Recorded task replay** — a library of anonymized, recorded real task
  executions (observation sequences, plans, tool calls, outcomes) that
  can be replayed against a new build to confirm behavior has not
  regressed, even for scenarios too varied or numerous to hand-author as
  individual end-to-end test cases.
- **VM-based testing** — automated tests running inside disposable VM
  snapshots configured to resemble realistic, "messy" real-world
  environments (partially organized file structures, multiple
  applications installed, existing browser history) rather than pristine
  test fixtures, specifically to surface issues that only manifest
  against realistic clutter.
- **Golden datasets** — a curated set of known-correct question/answer
  pairs against a fixed Memory/Knowledge Graph snapshot, used to detect
  retrieval-quality regressions in the Retrieval Fusion Engine
  (`docs/04-memory/retrieval-engine.md`) that would not surface as an
  outright failure but would degrade answer quality.
- **Regression benchmarks** — tracked over time per
  `docs/11-performance/benchmarks.md`, correlating simulation-test
  outcomes with performance metrics to catch cases where a change
  improves correctness at an unacceptable performance cost, or vice
  versa.
- **Human evaluation** — for scenarios where automated grading of
  correctness is itself ambiguous (e.g., judging whether a generated
  summary is genuinely faithful to source material), a sampled set of
  outputs is periodically reviewed by a human evaluator against defined
  rubrics, rather than relying solely on automated scoring for
  correctness dimensions automated scoring cannot reliably judge.

## Why recorded replay specifically

A hand-authored end-to-end test fixture reflects what the test author
anticipated; recorded real task replay reflects what actually happened,
including the ambiguity, partial information, and edge cases real usage
produces that a test author would not think to construct — this is the
direct answer to the "agent whose environment is the live desktop"
testing gap.

## Privacy in recorded test data

Recorded task replay data used for simulation testing is anonymized and
handled under the same data-lifecycle principles as production Memory
(`docs/04-memory/memory-lifecycle.md`) — recorded scenarios used for
testing are not treated as exempt from the privacy commitments made
elsewhere in this repository.

## Related documents

- `docs/25-failure-modes/FM-08-code-generation-and-testing.md` — failure modes for this subsystem
- `testing-strategy.md` — this layer's place in the overall model
- `docs/04-memory/retrieval-engine.md` — the golden-dataset testing
  target
- `docs/11-performance/benchmarks.md` — the performance correlation this
  layer's regression tracking ties into
