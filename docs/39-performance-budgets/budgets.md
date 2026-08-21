# Performance Budgets

Chat first-token latency: <800ms local, <2s cloud fallback. Memory query: <150ms p95. App cold start: <2s to interactive. Voice round-trip (speech end to TTS start): <1.2s. Any regression beyond budget blocks release per `docs/12-testing/benchmarks.md`.

The runtime benchmark boundary is `PerformanceBudgetEvaluator`. It accepts
recorded samples for one or more budget domains, evaluates p95 for memory
queries and the maximum observed value for single-operation targets, and
returns a release-blocking report when an explicitly supplied domain has no
samples or exceeds its target. Omitted domains are not silently treated as a
passing measurement; they are simply outside that benchmark invocation’s
scope and must be supplied by the complete suite described in
`docs/11-performance/benchmarks.md`.
