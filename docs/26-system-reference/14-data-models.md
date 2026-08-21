# Data Models Reference

## Purpose

A single cross-cutting catalog of every entity in NOVA, in one place, so
no entity's shape has to be reconstructed by reading five different
component docs. Each entity's *authoritative* definition still lives in
its owning component's document (linked below) — this file is an index
and a consistency check, not a second source of truth. Where this file
and an owning document disagree, the owning document wins and this file
has drifted; see `11-documentation-lint-ci.md`.

## Scope

Every persisted or long-lived entity that crosses a component boundary
(i.e., that at least one other component reads or references). Purely
internal, component-private data structures are documented in that
component's own file and are not listed here.

## How to read each entry

For every entity: **fields**, **ownership**, **validation**,
**constraints**, **defaults**, **lifecycle**, **serialization**,
**persistence**, **relationships** — per the master documentation
outline, Section 5. Full field-by-field detail lives in the owning doc;
this table gives the summary and the cross-reference.

## Entity catalog

### Task

- **Owner:** Task Manager (`docs/03-runtime/task-manager.md`)
- **Fields:** `task_id` (UUID, immutable), `state`, `reason` (nullable;
  populated only when `state = WaitingUser`, one of
  `permission_confirmation` / `clarification_requested`), `plan_ref`,
  `parent_task_id` (nullable), `created_at`, `updated_at`,
  `origin` (user / autonomous / scheduled).
- **Validation:** `state` must be a valid transition per
  `docs/03-runtime/task-manager.md` (canonical;
  `docs/26-system-reference/04-state-transition-tables.md` is a derived,
  reconciled copy).
- **Constraints:** exactly one current state at any moment
  (`system-invariants.md`); `task_id` is never reused.
- **Defaults:** `state = Created` on creation.
- **Lifecycle:** `Created` → `Planning` → `Executing` → `Verifying` →
  `Completed`/`Unverified`/`Failed`, with `WaitingResources`, `Paused`,
  `WaitingUser`, `Retrying`, and `Cancelled` reachable per the full
  guarded transition table. See `docs/03-runtime/task-manager.md`.
- **Serialization:** JSON, versioned envelope (see Event System,
  `07-event-catalog.md`).
- **Persistence:** durable store keyed by `task_id`; see
  `docs/13-devops/storage-layout.md`.
- **Relationships:** references zero or one `parent_task_id`; produces
  one or more Events; may reference Memory entries it created.

### Memory Entry / Node

- **Owner:** Memory subsystem (`docs/04-memory/memory-architecture.md`,
  `docs/04-memory/knowledge-graph.md`)
- **Fields:** `node_id` (UUID, immutable), `tier` (Working / Recent /
  Long-term / Archive / agent-scratch, per `docs/04-memory/memory-types.md`
  — distinct from `type`, which is the content/fact type, e.g.
  observation, preference, decision), `type`, `content`, `confidence`,
  `verification_status` (`unverified` / `corroborated` /
  `user_confirmed`, per `docs/04-memory/memory-confidence.md`),
  `source_task_id`, `created_at`, `version`.
- **Validation:** `type` must be one of the types enumerated in `docs/04-memory/memory-types.md`; graph must remain acyclic
  (`system-invariants.md`).
- **Constraints:** never references a deleted node directly — deletion
  produces a tombstone (`docs/04-memory/memory-garbage-collection.md`).
- **Defaults:** `confidence` starts at the source's stated confidence;
  see `docs/04-memory/memory-confidence.md`. `verification_status`
  starts at `unverified`.
- **Lifecycle:** Created → Indexed → (Reinforced / Superseded) →
  Archived / Deleted. See `docs/04-memory/memory-lifecycle.md`. Always
  created in the Working Memory `tier`; promotion to Recent/Long-term/
  Archive happens per `docs/04-memory/memory-lifecycle.md`'s pipeline —
  never created directly into a later tier (see
  `docs/04-memory/indexing.md`'s Memory Classification step).
- **Serialization:** graph-native record plus embedding vector; see
  `docs/04-memory/embeddings.md`.
- **Persistence:** knowledge graph store + vector index; see
  `docs/04-memory/memory-storage.md`.
- **Relationships:** edges to other nodes (ontology in
  `docs/04-memory/ontology.md`); many-to-one with source Task.

### Plugin

- **Owner:** Extensibility subsystem
  (`docs/16-extensibility/plugin-lifecycle.md`)
- **Fields:** `plugin_id` (immutable), `version`, `manifest`,
  `granted_permissions`, `state`, `installed_at`.
- **Validation:** manifest must declare every capability it uses; see
  `docs/16-extensibility/plugin-permissions.md`.
- **Constraints:** never has direct storage or internal-API access
  (`constraints.md`).
- **Defaults:** `granted_permissions = []` until explicitly approved.
- **Lifecycle:** `Installed` → `Enabled` ⇄ `Disabled`, with `Updating`
  and `Deprecated` reachable from `Enabled`, terminating in
  `Uninstalled` (reachable from `Disabled` or `Deprecated`). See
  `docs/16-extensibility/plugin-lifecycle.md`'s Lifecycle states section
  (canonical for these state names, per that document's own Status
  line) — this entry previously used a different, incorrect set of
  state names (`Discovered`/`Loaded`/`Running`/`Suspended`/`Removed`)
  that do not appear anywhere in the actual owning document.
- **Serialization:** manifest as JSON/TOML; see
  `docs/16-extensibility/plugin-versioning.md`.
- **Persistence:** local plugin registry; see
  `docs/13-devops/storage-layout.md`.
- **Relationships:** many-to-many with granted capabilities; one-to-many
  with emitted Events.

### Tool / Capability

- **Owner:** Tool system (`docs/06-tools/tool-registry.md`,
  `docs/06-tools/tool-interface.md`)
- **Fields:** `tool_id`, `execution_tier`, `deterministic`,
  `dependencies[]`, `schema_version`, `input_schema`, `output_schema`,
  `owning_component`, and a `supported_actions[]` array where each
  action carries its own `action_id`, `risk_tier`,
  `verification_signal`, `lockable_resources[]`, `permission_scope`,
  `estimated_latency_ms`, `estimated_cost_class`, `timeout_ms`, and
  `idempotent` — risk, verification, and idempotency are properties of
  the action, not the tool as a whole, since one tool can expose
  multiple actions at different risk tiers. See
  `docs/06-tools/tool-interface.md`'s Required metadata section for the
  authoritative schema; this entry summarizes it and must be corrected
  to match if the two ever diverge.
- **Validation:** every input validated against `input_schema` before
  execution; see `docs/06-tools/tool-interface.md`.
- **Constraints:** schema changes are additive-only within a major
  version; see `docs/06-tools/tool-schema-versioning.md`.
- **Lifecycle:** `Registered` → `Deregistered` (terminal; no separate
  "available" or "deprecated" state — see
  `docs/06-tools/tool-registry.md`'s Lifecycle section, which this
  previously did not match).
- **Serialization:** JSON Schema.
- **Persistence:** tool registry; see `docs/06-tools/tool-registry.md`.
- **Relationships:** referenced by Task plans; many-to-one with owning
  component or Plugin.

### Workspace

- **Owner:** Runtime / identity layer
  (`docs/28-multi-device-protocol/10-identity-and-workspace.md`)
- **Fields:** `workspace_id` (immutable), `owner_id`, `devices[]`,
  `created_at`.
- **Constraints:** exactly one owner at all times
  (`system-invariants.md`).
- **Lifecycle:** `Created` → `Active` ⇄ `Locked`, with `Recovering`
  reachable from either and returning to `Active`; no terminal/archived
  state. See
  `docs/28-multi-device-protocol/10-identity-and-workspace.md`.
- **Persistence:** durable store, replicated across paired devices; see
  `docs/28-multi-device-protocol/01-cross-device-sync.md`.
- **Relationships:** one-to-many with Devices, Tasks, and Memory nodes.

### Provider / Model Route

- **Owner:** Model routing (`docs/05-ai/model-router.md`,
  `docs/18-providers/provider-interface.md`)
- **Fields:** `provider_id`, `capabilities[]`, `credentials_ref`,
  `state` (`Registered` / `Removed` — lifecycle), `health_status`
  (`reachable` / `degraded` / `down` — live, independent of `state`).
- **Constraints:** `credentials_ref` never stores the raw secret inline;
  see `docs/10-security/secrets.md`.
- **Lifecycle:** `Registered` → `Removed` (terminal). `health_status` is
  a separate, continuously-updated field that does not itself change
  `state` — see `docs/18-providers/provider-interface.md`'s Lifecycle
  section (this entry previously described a single five-state lifecycle
  conflating the two; corrected).
- **Relationships:** many-to-many with Capabilities; referenced by the
  Model Routing Matrix (`docs/05-ai/model-routing-matrix.md`).

### Event

- **Owner:** Event bus (`docs/02-architecture/event-bus-specification.md`)
- **Fields:** `message_id` (globally unique, immutable), `type`,
  `payload`, `published_at`, `priority`.
- **Constraints:** duplicate `message_id` always treated as a
  redelivery, never a new event (`system-invariants.md`).
- **Lifecycle:** Published → Delivered → Acknowledged / Retried /
  Dead-lettered. See `docs/26-system-reference/07-event-catalog.md`.
- **Relationships:** every mutation of every other entity in this
  catalog produces at least one Event (`system-invariants.md`).

## Consistency rule

Any new entity that crosses a component boundary must be added here in
the same change that introduces it, per the documentation-lint check in
`11-documentation-lint-ci.md`. An entity added to an owning doc but
omitted here is treated as a documentation defect, not a minor omission,
because this catalog is what an AI implementer or reviewer checks first
when a task touches more than one subsystem.
