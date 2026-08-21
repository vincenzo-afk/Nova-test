# FM-21: Catastrophic Failures

## Purpose

The failures severe enough to warrant their own incident-response runbook rather than a routine mitigation table entry. Every entry here must have a corresponding named runbook in `docs/13-devops/incident-response.md` and `docs/13-devops/runbook.md` — this file is the index and cross-reference, not a substitute for those runbooks.

## Scope & Related Documents

This file is part of `docs/25-failure-modes/`, the project-wide failure-mode catalog. It must be read alongside:

- `docs/13-devops/incident-response.md` - `docs/13-devops/runbook.md` - `docs/13-devops/recovery.md` - `docs/13-devops/backup.md`

## Failure Catalog

Each failure is assigned a stable ID (`FM-21-0XX`) for cross-referencing from code comments, incident reports, and other failure-mode files.

| ID | Failure | Trigger Condition | Detection | Severity | Mitigation (prevent) | Recovery (respond) |
|---|---|---|---|---|---|---|
| **FM-21-001** | Database destroyed | Total loss of the primary data store (hardware failure, catastrophic bug, malicious action) with no viable in-place recovery. | Database unreachable/unrecoverable via standard `docs/13-devops/recovery.md` procedures. | Critical | Geographically/logically separate, regularly-tested backups per `docs/13-devops/backup.md`; the database itself must never be the only copy of critical data. | Full restore from the most recent tested backup per the runbook in `docs/13-devops/runbook.md`; communicate expected data-loss window (time since last backup) transparently to affected users. |
| **FM-21-002** | Memory graph corrupted | Knowledge-graph structure damaged beyond the scope of FM-01's routine repair procedures. | Graph-integrity check finds pervasive, not isolated, corruption. | Critical | Same backup/versioning discipline as FM-21-001, applied specifically to graph structure (`docs/04-memory/memory-versioning.md`). | Restore graph structure from the last valid versioned snapshot; replay any recoverable event-log entries since that snapshot. |
| **FM-21-003** | All providers offline | Every configured model provider (cloud and local) is simultaneously unavailable. | Fallback chain (FM-04) fully exhausted across all configured providers at once. | Critical | Maintain a genuinely-offline-capable minimal local model as a last resort, distinct from cloud-dependent 'local' deployments. | Operate in degraded/offline mode using cached responses and the minimal local model; queue non-urgent requests for when connectivity/providers return. |
| **FM-21-004** | Plugin system unavailable | The extensibility runtime itself fails, taking down all plugin-dependent functionality simultaneously. | Plugin-runtime health check fails system-wide, not for an individual plugin. | High | Core NOVA functionality must not have a hard dependency on the plugin system being up (see FM-19's compounding note). | Restart the plugin runtime in isolation from core services; core functionality must continue operating throughout. |
| **FM-21-005** | Storage full (catastrophic scope) | Not a single volume nearing capacity (FM-16-004) but total available storage exhausted across all tiers with no automated remediation succeeding. | Automated cleanup/archival jobs (that would normally prevent this) have also failed or been insufficient. | Critical | Multi-tier storage with automated archival well before critical thresholds, plus hard alerting escalation if automated remediation itself isn't keeping pace. | Emergency manual archival/deletion per a pre-defined priority order (documented in the runbook, decided calmly in advance, not improvised during the incident). |
| **FM-21-006** | Backup unavailable | At the moment a restore is needed, no viable backup exists (see FM-14-016/017). | Restore attempt fails against every available backup generation. | Critical | Multiple independent backup generations/locations; the single-backup-source failure mode must never be able to fully deny recovery. | This is the worst-case scenario this whole document set exists to prevent — full data loss for the affected scope; conduct a blameless post-mortem and treat every contributing gap as a mandatory fix, not optional. |
| **FM-21-007** | Configuration deleted | Core system configuration lost (accidental deletion, corrupted config store). | System fails to start or behaves per hardcoded defaults instead of intended configuration. | High | Configuration-as-code, version-controlled and backed up independently of runtime state, per `docs/14-development/configuration.md`. | Restore configuration from version control / backup; never hand-reconstruct critical configuration from memory during an incident. |
| **FM-21-008** | Security compromise | Confirmed unauthorized access or control of NOVA infrastructure/data. | Security monitoring/audit (FM-12) confirms compromise beyond a single contained incident. | Critical | Defense-in-depth per FM-12, plus a rehearsed incident-response plan specifically for confirmed compromise (containment, eradication, recovery, disclosure). | Follow `docs/13-devops/incident-response.md`; contain first (revoke credentials, isolate affected systems), then eradicate, then recover, then conduct disclosure per legal/ethical obligations — in that order. |
| **FM-21-009** | Hardware failure | Physical device/server failure (disk, GPU, whole machine). | Hardware health monitoring / SMART alerts / total unresponsiveness. | High | Redundancy for critical hardware roles; design NOVA's architecture to tolerate a single node loss without full-system impact. | Failover to redundant hardware if available; restore from backup onto replacement hardware otherwise, per the runbook. |
| **FM-21-010** | OS crash | Underlying operating system crashes/panics, taking all NOVA processes down with it. | OS-level crash log / unexpected full-system reboot. | High | Same graceful-startup/resume discipline as FM-15 applied at the OS-crash-recovery level; nothing NOVA-specific may assume the OS never crashes. | Rely on FM-15's startup/resume-after-crash mitigations to bring services back cleanly; investigate the OS-level crash cause separately (may be hardware, driver, or resource-exhaustion related). |

## Compounding Failures

Notes on how failures in this file interact with failures elsewhere in this catalog — read these before assuming a bug is isolated to one subsystem.

- Every failure in this file is, structurally, a lower-severity failure elsewhere in this document set that either had no mitigation, or had a mitigation that itself failed (e.g. 'backup unavailable' is what happens when FM-14-016's mitigation doesn't hold). Treat this file as the tripwire for auditing whether the rest of the document set's mitigations are real.

## Severity Legend

- **Critical** — data loss, security compromise, or user-visible harm; requires an incident-response runbook, not just a bug ticket.
- **High** — silent incorrectness, significant user-visible breakage, or a failure that blocks task completion with no graceful degradation.
- **Medium** — degraded quality/UX or a failure with a working but imperfect fallback.
- **Low** — cosmetic, rare, or fully recoverable with negligible user impact.
