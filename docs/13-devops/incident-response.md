# Incident Response

## Purpose

Defines how to respond when NOVA has taken, or may have taken, an
unintended or harmful action — distinct from `runbook.md`'s routine
operational procedures, this document covers active incidents requiring
immediate containment and post-incident review.

## Scope

Incident containment and review process. Security vulnerability
disclosure specifically is `SECURITY.md`; this document covers incidents
in the broader sense, including non-security correctness failures with
real consequences (e.g., an incorrect file deletion despite
confirmation).

## Severity classification

Using the failure taxonomy in `docs/03-runtime/failure-recovery.md`:

- **Critical** — a destructive/irreversible action occurred without the
  required confirmation gate (`docs/10-security/permissions.md`), or a
  security boundary was crossed (`docs/10-security/threat-model.md`).
- **High** — a destructive action occurred with confirmation, but the
  outcome was clearly not what the user intended (a wrong-target
  deletion, for example).
- **Medium** — a task reported `Completed` but was later found to be `Unverified` in substance (a verification gap).
- **Low** — a task failed or was cancelled with no lasting effect beyond
  the failure itself.

## Immediate containment

1. Cancel any related in-flight task (`docs/03-runtime/task-manager.md`'s
   cancellation path) immediately — do not wait to fully diagnose before
   stopping further action.
2. If the incident involves a specific tool or plugin, disable it
   (`docs/16-extensibility/plugin-lifecycle.md` for plugins;
   deregistration for a built-in tool requires a code-level fix, tracked
   as a Critical-priority item in `docs/14-development/technical-debt.md`).
3. Preserve the audit trail for the incident
   (`docs/10-security/audit.md`) — do not let normal retention/expiration
   (`docs/04-memory/memory-lifecycle.md`) reclaim the relevant records
   before the incident review is complete; flag the relevant time range
   for retention hold.

## Investigation

Reconstruct the full causal chain using `correlation_id`
(`docs/02-architecture/communication-model.md`) from the original
request through every plan step, tool invocation, and verification
result, per the audit trail's design (`docs/10-security/audit.md`) —
this reconstruction must be possible directly from stored data without
needing to interview the system or guess.

## Rollback and compensation

Apply the rollback or compensating action appropriate to the affected
resource, per `docs/03-runtime/failure-recovery.md` — a Critical
incident's resolution is not considered complete until the affected
resource is restored or the user has been given a clear, honest account
of what could and could not be restored.

## Post-incident review

For Critical and High severity incidents: identify which invariant
(`docs/00-overview/system-invariants.md`) or architecture rule
(`docs/14-development/architecture-rules.md`) was violated, if any, and
whether the gap is in the rule itself, its enforcement, or a specific
component's implementation — recorded as an ADR-worthy finding
(`docs/15-decisions/`) if it reveals a genuine architectural gap, or a
tracked defect (`docs/14-development/technical-debt.md`) if it is an
implementation bug against an already-correct rule.

## Related documents

- `docs/25-failure-modes/FM-23-recovery-system-meta-failures.md` — failure modes for this subsystem
- `SECURITY.md` — vulnerability-specific disclosure process
- `docs/00-overview/system-invariants.md` — what an incident review
  checks against
- `docs/03-runtime/failure-recovery.md` — the taxonomy and mechanisms
  referenced above
