# Authorization

## Purpose

Defines what an authenticated caller — the UI Layer, an external API
consumer, or a specific agent instance — is permitted to do, layered on
top of the identity established by `authentication.md` and independent of the risk-tier confirmation gating in `permissions.md`.

## Scope

Authorization boundaries between callers and between agent instances.
Risk-tier-based confirmation for the actions themselves is `permissions.md`.

## Two independent authorization axes

NOVA enforces two authorization checks that operate independently, and an
action must pass both:

1. **Caller-level scope** — what an external API consumer or the UI Layer
   is permitted to request at all (e.g., an external API consumer using
   a token scoped to read-only search cannot submit a task requiring
   write access, regardless of that task's risk tier).
2. **Agent-instance scope** — the tool allowlist configured for the
   specific agent instance handling a task
   (`docs/05-ai/planner-agent.md`), enforced by the Permission Manager
   (`docs/03-runtime/permission-manager.md`) independent of the risk-tier
   check.

## Scope vocabulary

The closed set of scope strings referenced throughout this document and
by `docs/16-extensibility/plugin-architecture.md`'s `required_permissions`
field and `plugin-permissions.md`'s install-time review — a plugin
manifest, external API token, or agent-instance allowlist entry is
always one or more of these, never a free-text string invented ad hoc:

| Scope | Grants |
|---|---|
| `memory.read` | Query Memory/Knowledge Graph via Search or direct entity lookup |
| `memory.write` | Write a new memory record or Knowledge Graph node/edge |
| `files.read` | Read file content within the caller's already-granted filesystem folder scope (`permissions.md`'s Path containment enforcement) |
| `files.write` | Write/modify/delete a file within the caller's already-granted filesystem folder scope |
| `tools.invoke:read_only` | Invoke a tool declared at the `read_only` risk tier (`docs/10-security/permissions.md`'s Execution risk tiers table) |
| `tools.invoke:reversible_write` | Invoke a tool declared at the `reversible_write` risk tier |
| `tools.invoke:destructive_irreversible` | Invoke a tool declared at the `destructive_irreversible` risk tier — granting this scope does not itself bypass the mandatory confirmation that tier always requires |
| `task.submit` | Submit a new task to the Task Manager |
| `task.cancel` | Cancel an in-flight task |
| `config.read` | Read non-secret configuration values |
| `config.write` | Modify configuration values, subject to `docs/14-development/configuration-schema.md`'s validation |
| `network.external` | Make an outbound network call (a provider call, an MCP server connection, a webhook) |

A scope always names a capability, never a specific resource instance —
narrowing to a specific folder, project, or provider is the separate
per-grant restriction mechanism `Caller-level scopes` and `Agent-instance
scopes` below describe, layered on top of the scope itself, not a
different scope string per resource. Adding a new scope to this table
follows the same discipline as `docs/26-system-reference/
06-error-catalog.md`'s code allocation: a row here in the same change
that introduces the capability needing it, never a scope string used in
code without a corresponding row.

## Caller-level scopes

Tokens issued for external API access (`authentication.md`) can be scoped
at issuance to a subset of capability — e.g., a read-only scope
permitting Memory/Knowledge Graph queries but not task submission, or a
scope permitting task submission but restricted to a specific project.
This scoping is checked at the API Gateway (`docs/02-architecture/service-architecture.md`) before a request is even forwarded to Task
Manager.

## Agent-instance scopes

As detailed in `docs/05-ai/planner-agent.md` and enforced per `docs/03-runtime/permission-manager.md`, every spawned agent instance
carries a tool allowlist that bounds what it can invoke regardless of
what the Planner might otherwise select — this prevents, for example, a
sub-task instance scoped to "read and summarize a document" from being
able to invoke a destructive file-deletion tool even if some upstream
reasoning error caused the Planner to select one.

## No privilege escalation across boundaries

An agent instance cannot grant itself a broader tool allowlist than it
was configured with, an external API caller cannot exceed their token's
scope by any request parameter, and an MCP server
(`docs/06-tools/mcp.md`) cannot grant its own tools broader access than
the invoking instance's allowlist already permits — each of these
boundaries is enforced independently, so a failure in one does not by
itself grant escalated privilege through another.

## Related documents

- `docs/25-failure-modes/FM-12-security-sandbox-identity.md` — failure modes for this subsystem
- `authentication.md` — identity verification this builds on
- `permissions.md` — the separate, risk-tier-based confirmation gate
- `docs/05-ai/planner-agent.md`, `docs/03-runtime/permission-manager.md`
  — agent-instance scope enforcement
