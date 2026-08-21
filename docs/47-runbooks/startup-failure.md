# Startup Failure — Runbook

Symptoms: app fails to reach ready state. Detection: `02-startup-sequence.md` step timeout. Logs: per-service boot logs in order. Root causes: corrupted config, a service deadlocked awaiting another. Recovery: fall back to last-known-good config per `docs/37-edge-cases/corrupted-config.md`.
