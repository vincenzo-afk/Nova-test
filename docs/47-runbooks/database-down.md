# Database Down — Runbook

Symptoms: memory writes/reads failing. Detection: state-manager health check. Logs: storage-layer error logs. Root causes: disk full, corruption, process crash. Recovery: run `docs/38-disaster-recovery/crash-recovery.md` integrity check; restore from backup if corruption confirmed.
