# Tool System

## Purpose

Defines what a "tool" is in NOVA's architecture and the shared contract
every tool integration — regardless of execution tier — must satisfy to
be registered and used.

## Scope

The conceptual tool abstraction. The catalog implementation is
`tool-registry.md`; the concrete interface contract is
`tool-interface.md`; the escalation ordering across tiers is
`execution-priority.md`.

## Definition

A tool is any registered, callable capability NOVA can invoke to affect
or query the user's system: a native function, a direct API call, an MCP
call, a CLI command, an accessibility-tree interaction, or a vision-guided
keyboard/mouse interaction. Every tool belongs to exactly one execution
tier (`execution-priority.md`) and is tagged with a risk tier
(`docs/10-security/permissions.md`, Tier 3).

## What every tool must declare

- **Execution tier** — which of the seven tiers in
  `execution-priority.md` it belongs to.
- **Risk tier** — read-only, reversible-write, or destructive/
  irreversible, per the action it performs (a single tool may support
  multiple actions at different risk tiers, e.g., a file tool with both a
  read and a delete operation).
- **Verification signal** — what ground-truth evidence, if any, it can
  provide to the Verifier (`docs/03-runtime/verifier.md`) after
  execution; a tool with no declared signal is restricted to
  confirmation-required execution only (`tool-interface.md`).
- **Lockable resources** — which resources, if any, it requires exclusive
  access to via the Resource Manager (`docs/03-runtime/resource-manager.md`).
- **Permission scope** — what OS-level capability it requires, informing
  the permission center (`docs/10-security/permissions.md`, Tier 3).

## Why one shared contract across all tiers

A CLI command and a vision-guided click are extremely different
mechanically, but both need to answer the same questions before the
Executor is willing to run them: what tier are you, what risk do you
carry, how do we know if you worked, and what do you need exclusive
access to. Defining one contract that every tier's tools satisfy is what
lets the Executor (`docs/03-runtime/executor.md`) remain a single,
generic invocation mechanism rather than needing tier-specific special
casing at the point of execution.

## Tool lifecycle

A tool is registered once, at the moment its source becomes available —
at NOVA startup for built-in native functions, or at configuration time
for any of the other sources `docs/06-tools/tool-registry.md` enumerates
(MCP server connection, CLI command wrapper registration, direct API
integration configuration, or plugin installation) — remains in the Tool
Registry until explicitly deregistered, and is looked up per-step by Tool
Selection (`docs/05-ai/tool-selection.md`) — tools are not dynamically
created or destroyed per task the way agent instances are
(`docs/05-ai/planner-agent.md`).

## Related documents

- `docs/25-failure-modes/FM-07-tool-execution-and-mcp.md` — failure modes for this subsystem
- `tool-registry.md` — the catalog implementation
- `tool-interface.md` — the exact interface contract
- `execution-priority.md` — the tier ordering tools are organized under
