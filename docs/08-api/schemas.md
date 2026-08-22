# API Schemas

## Purpose

The authoritative reference for request/response payload shapes across
the REST, WebSocket, and webhook surfaces described in this folder.

## Scope

Schema definitions only. Endpoint behavior is described in `rest-api.md`,
`websocket.md`, and `events.md`.

## Task submission (REST `POST /tasks`, request)

```json
{
  "goal": "string, natural-language or structured task description",
  "context_hint": "optional string, e.g. a project identifier to scope retrieval",
  "priority": "interactive | background (default: interactive)"
}
```

## Task status (REST `GET /tasks/{id}`, response)

```json
{
  "task_id": "string",
  "correlation_id": "uuid",
  "state": "created | planning | waiting_resources | executing | verifying | paused | waiting_user | retrying | completed | unverified | failed | cancelled",
  "retry_count": "integer",
  "steps": [
    {
      "step_id": "string",
      "tool_id": "string",
      "execution_tier": "string, per docs/06-tools/execution-priority.md",
      "risk_tier": "read_only | reversible_write | destructive_irreversible",
      "result": "structured result per docs/06-tools/tool-interface.md, or null if pending"
    }
  ],
  "created_at": "ISO 8601",
  "updated_at": "ISO 8601"
}
```

This mirrors the Task Manager's internal state machine
(`docs/03-runtime/task-manager.md`) directly — the external schema does
not rename or reinterpret the internal terminal states, so "unverified"
is exposed to external consumers exactly as it is understood internally,
never collapsed into "completed" or "failed" for external simplicity.
Note that `archived` is deliberately absent from this state enum: it is
not a task execution state but a later memory-lifecycle transition
applied to the underlying record (`docs/04-memory/memory-lifecycle.md`),
queried separately rather than conflated with task execution state.

## Memory/search query (REST `POST /search`, request)

```json
{
  "query": "string",
  "filters": {
    "project": "optional string",
    "time_range": { "start": "ISO 8601", "end": "ISO 8601" },
    "entity_type": "optional, per docs/04-memory/ontology.md node types"
  }
}
```

## Knowledge Graph query (REST `POST /graph/query`)

```json
{
  "node_id": "string",
  "direction": "in | out | both (default: both)",
  "edge_type": "optional fixed ontology edge type",
  "depth": "integer from 1 to 3 (default: 1)"
}
```

The response contains the root node, all matching nodes reached within the
requested traversal depth, and the matching edges used to reach them:

```json
{
  "root": { "id": "string", "type": "string", "name": "string", "properties": {}, "active": true },
  "nodes": [],
  "edges": []
}
```

`direction` selects incoming, outgoing, or both relationship directions.
When `edge_type` is supplied, only that fixed ontology relationship type is
traversed. The default depth is one hop; depth three is the REST safety
maximum.

## Memory record lookup (REST `GET /memory/{record_id}`, response)

```json
{
  "record_id": "string",
  "lineage": [
    { "relation": "derived_from", "source_record_id": "string" },
    { "relation": "summarized_from", "source_record_ids": ["array of strings"] },
    { "relation": "merged_from", "source_record_ids": ["array of strings"] },
    { "relation": "split_from", "source_record_id": "string" }
  ]
}
```

The response preserves the record's provenance relationships as defined by
`docs/04-memory/memory-lineage.md`; additional record metadata is returned by
the backing memory handler when available.

## WebSocket subscription message

```json
{
  "action": "subscribe | unsubscribe",
  "topic": "string, e.g. task.progress.<task_id> or system.status",
  "replay_from": "optional message_id or timestamp"
}
```

## Webhook payload envelope

```json
{
  "event_id": "uuid",
  "topic": "string",
  "timestamp": "ISO 8601",
  "signature": "HMAC signature using the registration's shared secret",
  "payload": "topic-specific structured data"
}
```

## Versioning note

All schemas above are versioned per `versioning.md` — a schema version is
included in every response's headers (REST) or envelope (WebSocket/
webhook), following the same semver compatibility rules as the internal
message envelope (`docs/02-architecture/communication-model.md`).

## Related documents

- `docs/25-failure-modes/FM-27-external-api-surface.md` — failure modes for this subsystem
- `rest-api.md`, `websocket.md`, `events.md` — the endpoints using these
  schemas
- `docs/03-runtime/task-manager.md` — the internal state machine the task
  schema mirrors
- `versioning.md` — schema versioning policy
