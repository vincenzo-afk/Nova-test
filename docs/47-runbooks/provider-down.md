# Provider Down — Runbook

Symptoms: elevated fallback-route rate, user-visible latency spike. Detection: provider health-check failures in `docs/35-analytics/metrics.md`. Logs: model-router logs filtered by provider ID. Root causes: outage, auth expiry, rate-limit. Recovery: confirm fallback chain engaged; rotate credentials if auth; page provider if outage confirmed. Escalation: if all providers in a capability domain are down, notify user of degraded mode.
