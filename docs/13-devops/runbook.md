# Operational Runbook

## Purpose

Step-by-step procedures for common operational situations a user or
maintainer needs to handle NOVA through directly, distinct from the
architectural documentation of *why* each mechanism exists elsewhere in
this repository.

## Scope

Routine operational procedures. Handling an active incident specifically
is `incident-response.md`; this document covers expected, non-emergency
operational tasks.

## Procedure: NOVA appears unresponsive

1. Check the Tray icon's status indicator (`docs/09-ui/tray.md`) for a
   degraded-service signal.
2. If degraded, open the Desktop application's Task Monitor
   (`docs/09-ui/task-monitor.md`) to check for a task stuck in
   `Executing` beyond its expected duration.
3. If a specific task is stuck, use its cancel control
   (`docs/03-runtime/task-manager.md`'s cancellation path) rather than
   restarting the whole service.
4. If the whole service is unresponsive (not just one task), restart the
   NOVA Windows service (`docs/13-devops/deployment.md`) — this triggers
   the crash-recovery sequence in `docs/02-architecture/lifecycle.md`,
   which is designed to safely resume or mark in-flight work
   appropriately, not lose it.

## Procedure: rotating an AI provider API key

1. Update the credential in the OS credential vault
   (`docs/10-security/secrets.md`) directly — NOVA's own configuration
   only stores a reference, so no NOVA-side configuration change is
   needed.
2. The next call to that provider resolves the new credential
   automatically; no restart is required.

## Procedure: reviewing what NOVA has been doing

1. Open Memory Explorer (`docs/09-ui/memory-explorer.md`) and filter by
   time range or project.
2. For a specific task's full reasoning, request an explanation
   (`docs/05-ai/explainability.md`) or inspect its audit trail entry
   directly (`docs/10-security/audit.md`).

## Procedure: freeing disk space

1. Check current storage usage in Memory Explorer
   (`docs/09-ui/memory-explorer.md`).
2. Delete a specific time range if appropriate
   (`docs/04-memory/timeline.md`) — note this triggers the deletion
   cascade described there, not merely a soft hide.
3. If storage remains high despite no manual deletion, confirm the
   background garbage collection pass
   (`docs/04-memory/memory-garbage-collection.md`) is running (check
   Tray status, `docs/09-ui/tray.md`) rather than assuming expired
   records are reclaimed instantly.

## Procedure: a plugin is misbehaving

1. Disable the plugin (`docs/16-extensibility/plugin-lifecycle.md`) —
   this deregisters its tools immediately.
2. Check whether other enabled plugins depend on it
   (`docs/16-extensibility/plugin-dependencies.md`) before considering
   uninstalling it entirely.
3. Report the issue through the plugin's own publisher channel, not
   NOVA's own issue tracker, unless the misbehavior indicates a gap in
   NOVA's sandboxing (`docs/16-extensibility/plugin-sandboxing.md`)
   itself, in which case follow `SECURITY.md`.

## Procedure: backup restore drill

Performed periodically (tracked as a job per
`docs/03-runtime/job-scheduler.md`) and before any major release
(`docs/14-development/release-checklist.md`), to confirm backups are
actually restorable, not merely being created:

1. Take a fresh snapshot (`docs/13-devops/backup.md`) of a test instance
   with representative data volume.
2. Compute and record a checksum of the snapshot's contents.
3. Restore the snapshot into an isolated test environment (never the
   live instance) via the sequence in `docs/13-devops/recovery.md`.
4. Verify the restored checksum matches the original.
5. Run the integrity check described in `docs/13-devops/recovery.md`
   against the restored instance.
6. Confirm a sample of known queries (e.g., specific Memory Explorer
   searches, Knowledge Graph traversals) against the restored instance
   return the expected results, not just that the integrity check passes
   structurally — a structurally valid but semantically wrong restore
   would pass step 5 while still failing this step.
7. Record the drill's outcome, duration, and any discrepancy found —
   feeding `docs/14-development/technical-debt.md` if the drill reveals
   a gap in the backup or restore process itself.

A failed drill blocks the next release per
`docs/14-development/release-checklist.md`'s pre-release backup
confirmation requirement — a backup mechanism that has not been drilled
successfully within a recent window is not treated as trustworthy.

## Related documents

- `docs/25-failure-modes/FM-23-recovery-system-meta-failures.md` — failure modes for this subsystem
- `incident-response.md` — for situations requiring more than a routine
  procedure
- `docs/13-devops/monitoring.md` — the self-monitoring signals these
  procedures often start from
- `docs/13-devops/backup.md`, `recovery.md` — for storage corruption,
  distinct from the routine procedures above
- `docs/03-runtime/job-scheduler.md` — the scheduling mechanism running
  the drill periodically
- `docs/14-development/release-checklist.md` — the release gate this
  drill feeds
