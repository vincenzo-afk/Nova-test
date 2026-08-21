# Memory Usage (Resource)

Baseline idle RAM budget defined per platform (desktop vs. Android companion, which is far more constrained); any new observer or cache must be profiled against this budget. Concretely, on desktop: under 600MB RAM at idle across all supervised services, per `docs/11-performance/resource-usage.md`'s and `docs/11-performance/performance-goals.md`'s idle-budget row — this file is the platform-specific budget summary; those are the enforced number, and this file must be corrected to match if the two ever disagree.
