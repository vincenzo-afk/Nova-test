# Benchmarks

The benchmark suite itself — composition, cadence, aged-dataset
methodology, AI-quality metrics — is fully specified in
`docs/11-performance/benchmarks.md`; this file adds only the
performance-budget-specific framing: benchmark runs use a fixed
reference dataset (the same aged/scaled dataset described in that
document's Realistic-scale testing section, not a separate one) so
release-over-release comparisons aren't confounded by a developer's
local data varying run to run. A result exceeding the budgets defined
elsewhere in `docs/39-performance-budgets/` is a release-blocking
regression per `docs/12-testing/benchmarks.md`'s CI integration — this
file does not define its own separate pass/fail thresholds.
