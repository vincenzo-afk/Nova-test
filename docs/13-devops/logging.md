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

## Implemented structured logger

Nova implements this contract through `@nova/shared`'s `StructuredLogger`,
`MemoryLogSink`, and `FileJsonlLogSink`. Desktop runtime construction shares
one logger between the Electron main process, the local NamedPipe bus, the API
Gateway, RuntimeApplication, permission storage, orchestration, and the
browser metadata observer. The default desktop sink is a local JSONL file at
`<userDataPath>/logs/nova.jsonl`; it creates its directory on demand and
retains only the configured recent window and record bound. The default
retention window is seven days and the default maximum is 10,000 records.

Every record is a JSON object with `timestamp`, `service`, `severity`,
`event`, `details`, and an optional `correlation_id`. Timestamps are validated
as UTC ISO-8601 values. The standard levels are `debug`, `info`, `warning`,
`error`, and `critical`. High-volume transport receipt and successful delivery
records are debug-level; lifecycle, permission, rejection, failure, and
completion checkpoints are info-level or higher. A caller can inject a
`MemoryLogSink` in tests or another local `LogSink` without changing feature
behavior.

| Boundary | Required checkpoint evidence | Deliberately omitted |
|---|---|---|
| Communication bus | publish receipt/completion, duplicate delivery, successful delivery, retry, and dead-letter code | envelope payload and error text that may contain user data |
| NamedPipe transport | startup and outbound publish metadata | local pipe path and payload |
| API Gateway | lifecycle, request receipt, rejection, handler failure, and response outcome | request data, credentials, and handler response bodies |
| Permission and orchestration | grant update, authorization decision, executor invocation/result, and verifier outcome | action parameters, raw resource contents, and credential values |
| Runtime and observers | startup/recovery/shutdown, adoption outcome, permission gating, policy exclusion, queue, publication, and revocation | protected observation content, raw screen data, keystrokes, and page content |

The sanitizer recursively redacts credential-like keys, browser page/form
content, entered text, keystrokes, clipboard and notification bodies,
screenshots, raw content, bearer tokens, common API-token patterns, and email
addresses. Strings are bounded to 512 characters by default, arrays and object
entries are bounded, and circular structures are represented by a marker.
Feature code must log identifiers, stable codes, counts, states, types, and
bounded metadata rather than copying input payloads into `details`.

Logging failures are not silently swallowed: a sink write failure propagates
to the caller so the owning boundary can surface or handle the failure. This
supports FM-17-001 and FM-17-005 while the local retention and level policy
limit FM-17-006 risk. Diagnostic JSONL files are local troubleshooting
artifacts, not a replacement for the user-facing action audit trail defined in
`docs/10-security/audit.md`.

## Related documents

- `docs/25-failure-modes/FM-17-observability.md` — failure modes for this subsystem
- `docs/10-security/audit.md` — the user-facing action record this
  technical logging complements but does not duplicate
- `monitoring.md` — self-monitoring built on these logs
- `docs/02-architecture/communication-model.md` — the `correlation_id`
  mechanism linking logs to actions
