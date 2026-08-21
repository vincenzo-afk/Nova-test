# Network — Edge Case

## Scenario

Total loss mid-request; slow/high-latency (not down); DNS resolves but connection refused; intermittent flapping. NOVA must distinguish these and degrade to `docs/05-ai/deterministic-first.md` local-only mode rather than hang.

## Requirement

Every edge case in this directory must have an explicit test in `12-testing/` — an edge case with no test is an edge case that will regress silently.
