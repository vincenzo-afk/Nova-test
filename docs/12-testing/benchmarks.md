# Benchmark Test Execution

## Purpose

Describes how the performance benchmark suite defined in
`docs/11-performance/benchmarks.md` is integrated into automated test
execution and CI — the operational, test-infrastructure counterpart to
that document's measurement methodology.

## Scope

CI integration and execution scheduling for performance benchmarks. What
is measured and why is `docs/11-performance/benchmarks.md`.

## Execution cadence

The full benchmark suite runs on every change to a service documented in
`docs/03-runtime/`, `docs/04-memory/`, `docs/05-ai/`, or `docs/06-tools/`
— the layers most likely to affect the latency and cost targets in
`docs/11-performance/performance-goals.md` — plus on a fixed daily
schedule against the current main branch to catch gradual drift that a
single change might not trigger on its own.

## CI gating

A benchmark run that exceeds its target by more than the configured
regression margin (per `docs/11-performance/benchmarks.md`) blocks merge
until investigated — this is a hard gate for the latency and resource-
usage targets in `docs/11-performance/performance-goals.md`, not merely
an informational report reviewers may or may not act on.

## Historical tracking

Every benchmark run's results are stored and plotted over time, not just
compared against the immediately preceding run — this is what allows
detecting slow, cumulative drift across many small changes, each
individually within the regression margin but collectively significant,
which a single-run comparison would miss.

## Realistic-scale execution

Consistent with `docs/11-performance/scalability.md`'s requirement that
performance targets hold as data grows, the benchmark suite's CI
execution includes runs against the artificially aged datasets described
in `docs/11-performance/benchmarks.md`, on a less frequent cadence than
the fresh-instance runs given their higher resource cost to execute.

## Relationship to simulation testing

Where `simulation-tests.md`'s recorded-replay scenarios are primarily
evaluated for correctness, the same replay executions are also
instrumented for latency and resource usage, feeding the same benchmark
tracking described here — correctness and performance regression
detection share the same underlying recorded-scenario infrastructure
rather than maintaining two separate test corpora.

## Related documents

- `docs/25-failure-modes/FM-08-code-generation-and-testing.md` — failure modes for this subsystem
- `docs/11-performance/benchmarks.md` — the measurement methodology this
  document operationalizes
- `simulation-tests.md` — the shared recorded-scenario infrastructure
- `testing-strategy.md` — this activity's place in the overall testing
  model
