# MCP (Execution Tier 4)

## Purpose

Describes NOVA's integration with the Model Context Protocol: how MCP
servers are connected, how their capabilities are discovered and
registered as tools, and how the trust boundary between NOVA and a
third-party MCP server is enforced.

## Scope

MCP-specific connection, discovery, and trust mechanics. General tool
registration is `docs/06-tools/tool-registry.md`; this document covers
what is specific to MCP as a source.

## Connection and capability discovery

On configuration of a new MCP server (endpoint, authentication reference),
NOVA performs capability discovery per the MCP specification: enumerating
the server's exposed tools, resources, and prompts. Each discovered tool
is then mapped into NOVA's `tool-interface.md` schema — this mapping
requires the MCP server's tool descriptions to supply enough information to
populate risk tier and verification signal; where they do not, the
tool is registered conservatively as `verification_signal: "none"`,
restricting it to confirmation-required execution, per
`tool-interface.md`'s hard rule.

The runtime's discovery-normalization boundary accepts an already-retrieved
bounded `tools/list` advertisement and registers each tool under the
`<server_id>.<tool_name>` namespace. The advertisement's input schema is
preserved as the action input schema; absent output metadata is represented
by a generic object schema. Missing execution metadata defaults to
`risk_tier: "destructive_irreversible"`, `verification_signal: "none"`,
`idempotent: false`, and the server-scoped permission `mcp:<server_id>`.
These defaults prevent an unverified external advertisement from becoming
eligible for unattended execution. The full advertisement batch is validated
before any registry mutation, duplicate names are rejected, and a server's
registered tools can be deregistered by source without affecting other MCP
servers. This boundary does not open a transport, spawn a process, or claim
that the remote advertisement was successfully obtained.

## Transport

Transport is JSON-RPC per the MCP specification, over one of exactly two
mechanisms, selected deterministically from the server's configured
connection type at registration time — never negotiated, probed, or
chosen by fallback:

- **Locally-spawned MCP server process** (a configured local command) —
  transport is stdio.
- **Remote MCP server** (a configured network endpoint URL) — transport
  is Streamable HTTP (HTTP POST with SSE for server-to-client streaming),
  per the MCP specification's remote-transport definition.

A given registered server uses exactly one of these two transports for
its entire connection lifetime; NOVA does not attempt the other
transport if the configured one fails — a failed connection is a
connection failure (`docs/25-failure-modes/`), not a signal to retry
over the other mechanism.

## Trust boundary

An MCP server is an external, potentially untrusted component. NOVA
enforces the trust boundary at two points, independent of whatever the
MCP server itself claims about its own safety:

1. **Permission scope** — a connected MCP server's tools are only ever
   invoked within the calling agent instance's configured tool allowlist
   (`docs/05-ai/planner-agent.md`); an MCP server cannot grant itself
   broader access than the instance invoking it already has.
2. **Secrets isolation** — authentication for an MCP server is stored in
   the OS credential vault (`docs/10-security/secrets.md`, Tier 3) and is
   never passed to or readable by the MCP server's own tool
   implementations beyond what that specific connection requires.

## Server-side scope denial

Distinct from the permission scope enforced above (which bounds what
NOVA will _attempt_): an MCP server may itself reject a call because the
credential NOVA holds for it lacks a required scope (e.g., an OAuth
token missing a specific API permission the server now requires). When
this happens, NOVA surfaces the specific missing scope to the user with
an explicit re-authorization action (re-running that server's
credential setup with the additional scope requested), rather than
silently retrying or treating it as a generic tool failure. Until
re-authorized, the affected action is treated as capability-unavailable
for planning purposes, per
`docs/25-failure-modes/FM-07-tool-execution-and-mcp.md`'s FM-07-014 —
never retried against the same insufficient credential.

## Content from MCP results treated as observed content

Data returned by an MCP tool call is treated as observed content, not as
instructions, under the Prompt System's content/instruction separation
(`docs/05-ai/prompt-system.md`) — this closes a specific variant of the
prompt-injection risk where a compromised or malicious MCP server could
attempt to return content designed to influence subsequent planning
rather than merely answer the query it was asked.

## Multiple MCP servers, same capability

Where more than one connected MCP server exposes an overlapping
capability (e.g., two different servers both offering file search), Tool
Selection's tie-breaking rules (`docs/05-ai/tool-selection.md`) apply
identically to MCP-sourced tools as to any other tool at the same tier —
MCP servers receive no special preference purely for being MCP-sourced.

## Related documents

- `docs/25-failure-modes/FM-07-tool-execution-and-mcp.md` — failure modes for this subsystem
- `execution-priority.md` — MCP's place in the tier ordering
- `docs/06-tools/tool-registry.md` — how discovered tools are registered
- `docs/05-ai/prompt-system.md` — the content/instruction separation
  applied to MCP results
- `docs/10-security/secrets.md` (Tier 3) — credential handling for MCP
  authentication
