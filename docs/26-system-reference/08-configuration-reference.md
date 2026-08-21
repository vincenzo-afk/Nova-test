# Configuration Reference

## Purpose

One page with the full illustrative `config.yaml`, every top-level
section, and every field's meaning — the single place to look up "what
can I configure and what does it do," complementing
`docs/14-development/configuration-schema.md`'s per-key formal schema
entries (type/default/scope/hot-reload) which remain the authoritative
source for any individual key's exact contract.

## Full illustrative `config.yaml`

Per FM-24-023 below: keys marked `[schema]` have a formal entry in
`docs/14-development/configuration-schema.md`'s Established keys list —
their values here are the real, authoritative default. Keys marked
`[illustrative]` have no formal schema entry yet; their values here are
a plausible placeholder for shape/format only, not a committed
contractual default — do not hardcode them as if authoritative. This
distinction is the direct fix for the drift this file's own FM-24-023
entry describes.

```yaml
runtime:
  idle_cpu_ceiling_percent: 3            # [schema]
  idle_ram_ceiling_mb: 600                # [schema]
  startup_step_timeout_s: 30             # [illustrative]
  restart_backoff_base_s: 2              # [illustrative]
  restart_max_attempts: 5                # [illustrative]

scheduler:
  max_concurrent_tasks: 8                 # [illustrative] — schema key exists but default is "(implementation-tuned, conservative)", not a fixed number
  starvation_age_boost_s: 300            # [illustrative]
  queue_high_watermark: 500               # [illustrative]

memory:
  recent_memory_retention_weeks: 4       # [schema] 2-6, hot-reloadable
  garbage_collection_interval_h: 24       # [illustrative]
  embedding_model: "local-embed-v2"        # [illustrative]
  vector_index_type: "hnsw"                # [illustrative]

knowledge_graph:
  query_latency_target_ms: 100           # [schema]
  entity_merge_min_confidence: 0.85       # [illustrative]
  cycle_check_on_write: true              # [illustrative] — the underlying invariant (system-invariants.md's acyclic-graph rule) is fixed and non-configurable; this flag illustrates the check exists, not that it can be turned off

providers:
  default_fallback_order:
    - "local-primary"
    - "cloud-a"
    - "cloud-b"
  circuit_breaker:
    consecutive_failure_threshold: 5      # [schema] — see 19-ordering-concurrency-and-retry-rules.md
    cooldown_s: 60                        # [schema] — see 19-ordering-concurrency-and-retry-rules.md
  ai:
    cost_budget_daily: null              # [schema] null = no budget enforced

security:
  destructive_action_confirmation_override: false   # [schema] fixed, cannot be set true
  encryption_at_rest: true                # [illustrative] — non-configurable per docs/10-security/encryption.md; shown for completeness, not because it can be toggled
  session_ttl_idle_minutes: 30           # [illustrative]
  session_ttl_expired_hours: 24           # [illustrative]

sandboxing:
  plugin_recycle_interval_h: 12           # [illustrative]
  plugin_memory_budget_mb: 256            # [illustrative]

voice:
  wake_word_sensitivity: 0.7              # [illustrative]
  echo_cancellation: true                 # [illustrative]
  tts_model: "local-tts-lite"              # [illustrative]

ui:
  theme: "system"                          # [illustrative]
  reduced_motion: false                   # [illustrative]

plugins:
  auto_update: "patch_only"              # [schema] disabled | patch_only | minor_and_patch
  marketplace_review_required: true       # [illustrative]

observers:
  clipboard:
    content_capture_enabled: false        # [schema]
  filesystem:
    watch_paths: []                        # [illustrative]

limits:
  max_context_tokens: 128000             # [illustrative] — distinct from a provider's own max_context_tokens capability field (docs/05-ai/model-providers.md); this is a NOVA-wide ceiling, not yet formally schema'd
  max_plan_steps: 50                      # [illustrative]
  max_task_recursion_depth: 6             # [illustrative]

timeouts:
  tool_invocation_default_s: 30          # [illustrative]
  provider_request_default_s: 60          # [illustrative]
  workflow_node_default_s: 120            # [illustrative]

resource_manager:
  lock_acquire_target_ms: 20              # [schema]

planner:
  simple_command_latency_target_s: 2      # [schema]
  reasoning_response_target_s: 5         # [schema]
```

## Section index

| Section | Purpose | Full schema detail |
|---|---|---|
| `runtime` | Process-level resource ceilings and restart policy | `docs/11-performance/performance-goals.md`, `docs/03-runtime/runtime-manager.md` |
| `scheduler` | Task concurrency and queue behavior | `docs/03-runtime/scheduler.md` |
| `memory` | Retention, GC, embedding model selection | `docs/04-memory/memory-lifecycle.md`, `embeddings.md` |
| `knowledge_graph` | Query performance targets, entity-merge thresholds | `docs/04-memory/knowledge-graph.md` |
| `providers` | Fallback order, circuit breaker tuning, cost budget | `docs/18-providers/provider-routing.md`, `docs/05-ai/model-router.md` |
| `security` | Confirmation policy, encryption, session TTLs | `docs/10-security/permissions.md`, `encryption.md` |
| `sandboxing` | Plugin resource budgets and recycling | `docs/16-extensibility/plugin-sandboxing.md` |
| `voice` | Wake-word sensitivity, echo cancellation, TTS model | `docs/22-voice/voice-assistant.md` |
| `ui` | Display preferences | `docs/09-ui/ui-overview.md` |
| `plugins` | Auto-update policy, marketplace review gate | `docs/16-extensibility/plugin-versioning.md`, `plugin-marketplace.md` |
| `observers` | Per-source observer configuration and permission gating | `docs/07-observers/*` |
| `limits` | Hard ceilings (context size, plan steps, recursion depth) | `docs/00-overview/system-invariants.md` |
| `timeouts` | Default timeout budgets per call type | `docs/03-runtime/failure-recovery.md` |
| `resource_manager` | Lock-acquisition performance target | `docs/03-runtime/resource-manager.md` |
| `planner` | Latency targets by task complexity tier | `docs/11-performance/performance-goals.md` |

## Precedence and scope

Configuration scope (`Global` vs `User`), hot-reload eligibility, and
precedence resolution across scopes are governed by
`docs/14-development/configuration.md` — this reference lists *what*
fields exist; that document governs *how* a value is ultimately resolved
when multiple scopes set it differently.

## Related documents

- `docs/14-development/configuration.md` — scopes, precedence, storage location
- `docs/14-development/configuration-schema.md` — formal per-key schema
  (type/default/min/max/hot_reload/required/source), authoritative for
  any individual key's exact contract
- `docs/10-security/secrets.md` — credentials are explicitly **not** in
  this file; they live in the OS credential vault, referenced by key name only

## Where This Breaks

This document is itself a build artifact an AI agent relies on. If it drifts from the real system, every agent that trusts it inherits the drift silently. The failures below are specific to *this document going stale or being wrong*, not to the subsystem it describes (see the cross-referenced FM files for that).

| ID | Failure | Trigger | Detection | Severity | Mitigation | Recovery |
|---|---|---|---|---|---|---|
| **FM-24-022** | Illustrative config drifts from the real schema | A key is renamed/removed in `configuration-schema.md` but this file's example `config.yaml` isn't updated. | Doc-lint validates every key in this file's example against the current schema file, failing on any key present in one but not the other. | Medium | Generate the illustrative `config.yaml` from the schema file mechanically rather than hand-maintaining both. | Regenerate this file's example from the current schema; treat manual drift as the signal to add the generation step. |
| **FM-24-023** | Reader treats the illustrative example as the actual shipped default | Every value in this file's example config.yaml is illustrative, not necessarily the literal shipped default — some defaults are 'implementation-tuned, conservative' per the schema file, not a fixed number. | An agent hardcodes an assumed default that doesn't match the actual shipped value. | Low | Every key in the example `config.yaml` above is tagged `[schema]` (has a formal, authoritative entry in `configuration-schema.md`) or `[illustrative]` (no formal entry yet; shown for shape/format only) — implemented directly in this document rather than left as a future intention. | Always cross-check against `configuration-schema.md`'s `default:` field before relying on a specific numeric value tagged `[illustrative]` in this file's example; a `[schema]`-tagged value can be relied on directly. |
| **FM-24-024** | See also `FM-15-004`, `FM-20-002` | Configuration drift at runtime and missing environment variables at deploy time are runtime consequences, cataloged separately from this document's own drift risk. | See `docs/25-failure-modes/FM-15-*.md` and `FM-20-*.md`. | — | See FM-15/FM-20. | See FM-15/FM-20. |
