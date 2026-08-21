# Logging

## Purpose

Specifies NOVA's technical/diagnostic logging — distinct from the
user-facing action audit trail (`docs/10-security/audit.md`), which
records *what NOVA did on the user's behalf*; this document covers
internal diagnostic logs used for debugging and operational monitoring.

## Scope

Diagnostic logging conventions. The action-level audit trail is
`docs/10-security/audit.md`; self-monitoring built on top of logs is
`monitoring.md`.

## Log levels and content

Standard severity levels (debug, info, warning, error, critical) per
service, with structured logging (not free-form text) carrying at
minimum: timestamp, service name, severity, and, where applicable, the
`correlation_id` (`docs/02-architecture/communication-model.md`) linking
a log entry back to the task or event that produced it — this is what
allows a diagnostic investigation to cross-reference technical logs
against the audit trail's higher-level action record for the same task.

## What never appears in diagnostic logs

Credential values (`docs/10-security/secrets.md`), raw clipboard/
notification content beyond what the relevant permission level allows
(`docs/07-observers/clipboard.md`, `docs/07-observers/notifications.md`), and keystroke/
mouse-movement content (never captured at all,
`docs/07-observers/keyboard.md`, `mouse.md`) — diagnostic logging is
held to the same content restrictions as the audit trail and observation
layer, not treated as an exemption where sensitive data might otherwise
leak.

## Log retention

Diagnostic logs are retained for a shorter, configurable window than
Memory/audit data, since their purpose is operational debugging rather
than durable record-keeping — old diagnostic logs are pruned
automatically, distinct from the user-controlled retention model
governing Timeline Memory and the audit trail (`docs/04-memory/timeline.md`, `docs/10-security/audit.md`).

## Log access

Diagnostic logs are accessible locally for troubleshooting (e.g., when a
user reports an issue) but are not transmitted externally by default —
consistent with the local-first, no-hosted-backend commitment
(`docs/00-overview/non-goals.md`), there is no default telemetry
pipeline sending logs off the device; any future opt-in diagnostic
sharing would be a separate, explicitly consented feature, not a
default behavior of this logging system.

## Related documents

- `docs/25-failure-modes/FM-17-observability.md` — failure modes for this subsystem
- `docs/10-security/audit.md` — the user-facing action record this
  technical logging complements but does not duplicate
- `monitoring.md` — self-monitoring built on these logs
- `docs/02-architecture/communication-model.md` — the `correlation_id`
  mechanism linking logs to actions
