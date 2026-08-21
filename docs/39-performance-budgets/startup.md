# Startup Performance

Service boot order (`02-startup-sequence.md`) is parallelized wherever dependencies allow; any new service added to boot must justify its startup cost against the budget: under 2 seconds to interactive (cold start), per `docs/39-performance-budgets/budgets.md`.
