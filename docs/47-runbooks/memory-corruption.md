# Memory Corruption — Runbook

Symptoms: retrieval returning malformed records, ranking crashes. Detection: checksum validation failures on read. Logs: memory-storage validation errors. Root causes: partial write from crash, disk error. Recovery: quarantine affected records per `docs/37-edge-cases/corrupted-memory.md`, restore from backup for quarantined range.
