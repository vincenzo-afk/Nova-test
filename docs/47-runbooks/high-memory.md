# High Memory — Runbook

Symptoms: elevated RAM usage, approaching OOM. Detection: `docs/39-performance-budgets/memory-usage.md` threshold. Logs: memory-tier size metrics, cache size metrics. Root causes: garbage collection pass not running, unbounded cache. Recovery: manual GC trigger, verify scheduled GC is actually running.
