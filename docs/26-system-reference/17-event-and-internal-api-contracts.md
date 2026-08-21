# Event & Internal API Contract Matrix

## Purpose

`docs/26-system-reference/07-event-catalog.md` and `docs/08-api/internal-api.md` already document every event and internal
API individually. This file is the dimension checklist: it confirms
every event and every internal API states the specific properties
Sections 5 and 6 of the master documentation outline require — publisher,
subscribers, ordering, retry, idempotency, and version for events;
input, validation, output, errors, side effects, idempotency, and
permissions for APIs — and calls out any that were missing one of those
dimensions.

## Scope

A completeness check and quick-reference matrix over existing event and
internal-API documents. Full payload schemas remain in those documents.

## Event contract dimensions (per event, per `07-event-catalog.md`)

Every event entry answers:

- **Name** — the event type identifier.
- **Publisher** — the one component that emits it.
- **Subscribers** — every component that consumes it (adding a new
  subscriber does not require the publisher's document to change, since
  the event bus decouples them — but it does require this catalog to be
  updated).
- **Payload** — schema reference.
- **Ordering** — whether delivery order is guaranteed relative to other
  events of the same type, per `docs/02-architecture/event-bus-specification.md`.
- **Priority** — delivery priority tier, if applicable.
- **Reliability / Retry** — at-least-once vs. at-most-once, and the
  retry policy applied on delivery failure (see
  `19-ordering-concurrency-and-retry-rules.md`).
- **Idempotent?** — whether redelivery of the same `message_id` is safe
  for every subscriber to process twice (system-wide default: yes, per
  `system-invariants.md`'s duplicate-`message_id` rule — an event type
  that cannot tolerate this must say so explicitly and justify why).
- **Dead-letter behavior** — where an undeliverable event goes.
- **Version** — schema version, per `20-versioning-contracts.md`.

Any event entry in `07-event-catalog.md` missing one of these dimensions
is a documentation defect to fix in that file directly, not here.

## Internal API contract dimensions (per API, per `docs/08-api/internal-api.md`)

Every internal operation answers:

- **Purpose** — what it does, in one line.
- **Parameters** — typed input.
- **Validation** — what is checked before execution, and what happens on
  failure (structured error, per `docs/26-system-reference/06-error-catalog.md`).
- **Return** — the guaranteed output shape.
- **Errors** — the specific error conditions it can produce.
- **Side effects** — anything mutated beyond the return value.
- **Atomicity** — whether the operation is all-or-nothing.
- **Idempotency** — whether calling it twice with the same input is
  safe; if not, what the caller must do to avoid double-effects (e.g.,
  a client-supplied idempotency key).
- **Timeouts** — the operation's own bound, per
  `19-ordering-concurrency-and-retry-rules.md`.
- **Retries** — whether the caller may retry automatically, and under
  what conditions.
- **Authorization** — the permission or risk-tier gate, per
  `docs/10-security/authorization.md`.
- **Versioning** — how a breaking change to this operation is rolled
  out, per `20-versioning-contracts.md`.

## Worked example: `createTask()`

- **Purpose:** Submit a new task for planning and execution.
- **Parameters:** `{ goal: string, workspace_id: string, context?: object }`.
- **Validation:** `goal` non-empty; `workspace_id` must reference an
  existing, active workspace.
- **Return:** `{ task_id: string, state: "Pending" }`.
- **Errors:** `InvalidGoal`, `WorkspaceNotFound`, `WorkspaceArchived`.
- **Side effects:** creates a Task record; emits `task.created`.
- **Atomicity:** the Task record and its `task.created` event are
  created within a single transaction (`persistence.md`, Transactions).
- **Idempotency:** not idempotent by default — calling it twice creates
  two tasks; a caller wanting idempotent submission supplies an
  `idempotency_key` parameter, which the Task Manager deduplicates
  against for a rolling window.
- **Timeouts:** must return within the internal-API default timeout
  (`19-ordering-concurrency-and-retry-rules.md`) — task *execution*, not
  submission, is long-running and tracked separately.
- **Retries:** safe to retry only with the same `idempotency_key`; retrying
  without one is a caller error, not a system responsibility.
- **Authorization:** requires an active, authenticated UI session
  (`docs/10-security/authentication.md`).
- **Versioning:** additive fields only within a major version; see
  `docs/08-api/versioning.md`.

## Maintenance rule

A new internal API or event type is not considered documented until
every dimension above is filled in — a partially-specified entry is
treated the same as an undocumented one for the purposes of the AI
Implementation Protocol's Phase 2 validation
(`docs/43-ai-development/implementation-order.md`).
