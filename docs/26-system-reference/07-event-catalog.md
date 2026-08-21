# Event Catalog

## Purpose

The consolidated, system-wide event type list with example JSON payload
shapes — extending `docs/07-observers/events.md` (observer-source events
only) to every event type NOVA emits internally on its event bus, per
`docs/02-architecture/event-driven-architecture.md`'s general envelope
and topic model.

## Envelope (shared by every event)

```json
{
  "event_id": "evt_01HZX...",
  "event_type": "task.completed",
  "occurred_at": "2026-07-22T09:41:12.331Z",
  "correlation_id": "task_01HZW...",
  "source": "task-manager",
  "schema_version": "1.0",
  "payload": { }
}
```

`schema_version` follows the additive/minor-compatible rule in`docs/02-architecture/communication-model.md` — existing consumers must
tolerate new optional fields appearing in `payload` without breaking.

## Catalog by domain

| Event Type | Emitted By | Payload (key fields) |
|---|---|---|
| `conversation.started` | Session Manager | `session_id`, `identity_id`, `channel` |
| `conversation.message_received` | Session Manager | `session_id`, `message_id`, `role`, `content_ref` |
| `task.created` | Task Manager | `task_id`, `goal`, `priority`, `origin` |
| `task.state_changed` | Task Manager | `task_id`, `from_state`, `to_state`, `reason` |
| `task.completed` | Task Manager | `task_id`, `verified: true\|false`, `duration_ms` |
| `plan.generated` | Planner | `task_id`, `plan_id`, `step_count` |
| `plan.validated` | Planner | `plan_id`, `result: valid\|invalid`, `errors[]` |
| `tool.invoked` | Executor | `task_id`, `tool_id`, `args_hash`, `idempotent: true\|false` |
| `tool.executed` | Executor | `tool_id`, `result: success\|failure\|timeout`, `duration_ms` |
| `memory.committed` | Memory | `memory_id`, `tier`, `identity_id`, `confidence` |
| `memory.conflict_detected` | Memory | `memory_id_a`, `memory_id_b`, `relation`, `resolution` |
| `graph.node_merged` | Knowledge Graph | `node_id_a`, `node_id_b`, `merged_into`, `confidence` |
| `provider.health_changed` | Model Router | `provider_id`, `from_state`, `to_state` — values are the `health_status` enum (`reachable`/`degraded`/`down`) per `docs/18-providers/provider-interface.md`; `down` reflects the circuit breaker being `Open`/`HalfOpen` per `docs/26-system-reference/19-ordering-concurrency-and-retry-rules.md`'s canonical definition, not a separate breaker-state enum |
| `capability.registered` | Capability Registry | `capability_id`, `provider_id`, `version` |
| `capability.disabled` | Capability Registry | `capability_id`, `reason` |
| `plugin.loaded` | Plugin Runtime | `plugin_id`, `version`, `manifest_hash` |
| `plugin.crashed` | Plugin Runtime | `plugin_id`, `error_code`, `restart_count` |
| `workflow.completed` | Workflow Engine | `workflow_id`, `outcome: succeeded\|failed\|dead_lettered` |
| `voice.activated` | Voice Assistant | `device_id`, `confidence`, `trigger: wake_word\|manual` |
| `approval.requested` | Policy Engine | `action_id`, `scope_summary`, `urgency` |
| `approval.resolved` | Policy Engine | `action_id`, `decision: approved\|denied\|timeout` |
| `sync.conflict_detected` | Runtime Manager (multi-device sync protocol, `docs/28-multi-device-protocol/01-cross-device-sync.md` — not a standalone "Sync Engine" service; no such component exists in `docs/02-architecture/service-architecture.md`'s service list) | `record_id`, `device_a`, `device_b`, `resolution` |
| `voice.wake_claimed` | Voice pipeline (per-device wake-word detector) | `device_id`, `detected_at`, `confidence` — broadcast over the mesh transport per `docs/22-voice/voice-assistant.md`'s Multi-device voice coordination mechanism, not delivered via the standard Event Bus, since it must reach other devices, not just other local services |
| `security.audit_entry` | Audit Log | `actor`, `action`, `resource`, `result` |

Observer-source events (`observer.filesystem.*`, `observer.window.*`,
etc.) are fully enumerated in `docs/07-observers/events.md` and are not
repeated here — that document remains authoritative for that one domain,
consistent with the same single-source-of-truth discipline used
throughout this repository.

## Example payload: `task.state_changed`

```json
{
  "event_id": "evt_01HZXAB3F8N7Q9M2K1P0R5T6W7",
  "event_type": "task.state_changed",
  "occurred_at": "2026-07-22T09:41:12.331Z",
  "correlation_id": "task_01HZW9K3M2N1P0Q5R6S7T8U9V0",
  "source": "task-manager",
  "schema_version": "1.0",
  "payload": {
    "task_id": "task_01HZW9K3M2N1P0Q5R6S7T8U9V0",
    "from_state": "Executing",
    "to_state": "Verifying",
    "reason": "all_steps_completed"
  }
}
```

## Adding a new event type

Same procedure as `docs/07-observers/events.md`'s "Adding a new event
type" section: extend the relevant table, register the topic, treat the
change as additive/minor unless it's a breaking payload change (which
requires a `schema_version` bump per `communication-model.md`).

## Related documents

- `docs/02-architecture/event-driven-architecture.md` — general event
  model, ordering, storm-handling rules
- `docs/02-architecture/communication-model.md` — envelope and
  schema-versioning rules
- `docs/07-observers/events.md` — the observer-source-specific event catalog
- `docs/08-api/events.md` — externally-exposed event subset for SDK consumers

## Where This Breaks

This document is itself a build artifact an AI agent relies on. If it drifts from the real system, every agent that trusts it inherits the drift silently. The failures below are specific to *this document going stale or being wrong*, not to the subsystem it describes (see the cross-referenced FM files for that).

| ID | Failure | Trigger | Detection | Severity | Mitigation | Recovery |
|---|---|---|---|---|---|---|
| **FM-24-019** | Catalog omits an event type that exists in code | New event type is added to the bus without a corresponding table row here. | Doc-lint cross-check: scan the codebase for `event_type` string literals and diff against this catalog. | Medium | Require a catalog update in the same PR that introduces a new event type, enforced by CI. | Backfill the missing row with an accurate payload example, not a placeholder. |
| **FM-24-020** | Example payload doesn't match the actual emitted shape | Payload example is hand-written and drifts from the real schema after a field is added/renamed. | Contract test validates a real emitted event against this document's example schema shape. | Medium | Generate example payloads from actual schema definitions/fixtures rather than hand-typing JSON. | Regenerate the example from a current fixture; treat hand-typed drift as a signal to add the generation step to the doc-lint pipeline. |
| **FM-24-021** | See also `FM-15-024` through `FM-15-029` | Missing events, duplicate events, out-of-order events, event storms, infinite event loops, and subscriber failure are the runtime consequences of this catalog being wrong or of the bus itself misbehaving. | See `docs/25-failure-modes/FM-15-architecture-runtime-lifecycle-events.md`. | — | See FM-15. | See FM-15. |
