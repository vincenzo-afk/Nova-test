# High Cpu — Runbook

Symptoms: system-wide slowdown. Detection: `docs/39-performance-budgets/cpu.md` threshold breach. Logs: per-service CPU profiling. Root causes: observer loop misbehaving, workflow loop not caught by cycle detection. Recovery: throttle/pause offending service, file a `36-failure-catalog` entry if novel.
