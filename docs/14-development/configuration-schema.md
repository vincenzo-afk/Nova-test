# Configuration Schema

## Purpose

Documents every configuration key already established with a concrete
value elsewhere in this repository, in one key-by-key reference format —
complementing `docs/14-development/configuration.md`'s precedence rules
with the actual keys those rules apply to.

## Scope

Key-by-key schema for settings this repository has already committed to
a specific value or range for. **This document does not invent new
settings with fabricated defaults** — a setting appears here only once
it has a real, traceable value established in its owning component
document; a new setting is added to this reference in the same change
that establishes its value elsewhere, per
`docs/14-development/module-checklist.md`.

## Schema format

Every entry follows:

```yaml
key: <dotted.path>
type: <integer | string | boolean | enum | duration>
default: <value>
minimum: <value, if applicable>
maximum: <value, if applicable>
hot_reload: <true | false>
required: <true | false>
scope: <docs/14-development/configuration.md scope this can be set at>
description: <one line>
source: <owning document>
```

## Established keys

```yaml
key: scheduler.max_concurrent_tasks
type: integer
default: (implementation-tuned, conservative)
minimum: 1
hot_reload: false
required: false
scope: Global
description: Maximum simultaneously executing tasks.
source: docs/03-runtime/scheduler.md, docs/11-performance/resource-usage.md

key: runtime.idle_cpu_ceiling_percent
type: integer
default: 3
hot_reload: false
required: false
scope: Global
description: Target maximum CPU usage at idle.
source: docs/11-performance/performance-goals.md

key: runtime.idle_ram_ceiling_mb
type: integer
default: 600
hot_reload: false
required: false
scope: Global
description: Target maximum RAM usage at idle.
source: docs/11-performance/performance-goals.md

key: knowledge_graph.query_latency_target_ms
type: integer
default: 100
hot_reload: false
required: false
scope: Global
description: Target latency for normal-retrieval Knowledge Graph queries.
source: docs/11-performance/performance-goals.md

key: resource_manager.lock_acquire_target_ms
type: integer
default: 20
hot_reload: false
required: false
scope: Global
description: Target latency for resource lock acquisition.
source: docs/11-performance/performance-goals.md

key: planner.simple_command_latency_target_s
type: integer
default: 2
hot_reload: false
required: false
scope: Global
description: Target end-to-end latency for a simple deterministic command.
source: docs/11-performance/performance-goals.md

key: planner.reasoning_response_target_s
type: integer
default: 5
hot_reload: false
required: false
scope: Global
description: Target time-to-first-meaningful-output for reasoning-required responses.
source: docs/11-performance/performance-goals.md

key: memory.recent_memory_retention_weeks
type: integer
default: 4
minimum: 2
maximum: 6
hot_reload: true
required: false
scope: User
description: Default retention window for raw Recent Memory detail before archival.
source: docs/04-memory/memory-lifecycle.md

key: security.destructive_action_confirmation_override
type: boolean
default: false
hot_reload: false
required: true
scope: Global
description: Whether destructive/irreversible action confirmation can be disabled. Fixed at false; no configuration path may set this true.
source: docs/10-security/permissions.md

key: plugins.auto_update
type: enum [disabled, patch_only, minor_and_patch]
default: patch_only
hot_reload: true
required: false
scope: User
description: Which plugin version changes apply automatically.
source: docs/16-extensibility/plugin-versioning.md

key: observers.clipboard.content_capture_enabled
type: boolean
default: false
hot_reload: true
required: false
scope: User
description: Whether clipboard content (not just type/metadata) is captured.
source: docs/07-observers/clipboard.md

key: permissions.browser_excluded_domains
type: string[]
default: []
hot_reload: true
required: false
scope: User
description: Hostnames or *.hostname wildcards excluded before browser metadata reaches the event bus or memory.
source: docs/07-observers/browser.md, docs/10-security/permissions.md

key: ai.cost_budget_daily
type: string (currency amount) | null
default: null (no budget enforced)
hot_reload: true
required: false
scope: User
description: Optional daily spend ceiling for cloud AI provider calls.
source: docs/05-ai/model-router.md, docs/11-performance/optimization.md

key: providers.circuit_breaker.consecutive_failure_threshold
type: integer
default: 5
minimum: 1
hot_reload: false
required: false
scope: Global
description: Consecutive failures to one dependency before its circuit breaker trips Closed → Open.
source: docs/26-system-reference/19-ordering-concurrency-and-retry-rules.md

key: providers.circuit_breaker.cooldown_s
type: integer
default: 60
minimum: 1
hot_reload: false
required: false
scope: Global
description: Seconds an Open circuit stays fail-fast before admitting one HalfOpen trial call.
source: docs/26-system-reference/19-ordering-concurrency-and-retry-rules.md
```

## Startup validation

Every `required: true` key above is validated at startup before any
other service initializes: presence (the environment variable or config
file key exists) and type/format (matches the declared schema). A
missing or malformed required key fails startup immediately with an
error naming the specific key, never a generic "configuration invalid"
message and never a partial startup that limps along with an unset
value, per
`docs/25-failure-modes/FM-20-deployment-and-evolution.md`'s FM-20-002.

## Keys intentionally not yet populated

Settings referenced conceptually elsewhere but not yet assigned a
concrete default in this repository (e.g., exact chaos-test fault-
injection rates, exact background-job scheduling intervals) are not
listed above — they will be added here in the same change that
establishes their real value, consistent with this document's no-
fabrication rule.

## Related documents

- `docs/25-failure-modes/FM-15-architecture-runtime-lifecycle-events.md` — failure modes for this subsystem
- `docs/14-development/configuration.md` — the scope precedence rules
  these keys resolve under
- `docs/11-performance/performance-goals.md` — the source of most
  numeric targets above
- `docs/14-development/module-checklist.md` — where adding a new setting
  is checked against this reference
