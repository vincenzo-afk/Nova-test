# Sync Failure — Runbook

Symptoms: devices showing divergent state. Detection: sync-status mismatch across devices. Logs: `28-multi-device-protocol/` sync logs. Root causes: clock skew, partial sync interruption. Recovery: resume from last checkpoint; full resync as last resort.
