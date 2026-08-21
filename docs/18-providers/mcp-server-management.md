# MCP Server Management

## Purpose

Covers the lifecycle and user-facing management of MCP server
connections as a first-class part of setup and ongoing configuration.
`docs/06-tools/mcp.md` specifies the protocol-level connection, discovery,
and trust boundary; this document specifies how a user (or NOVA acting
autonomously, per `docs/23-autonomy/autonomous-plugin-discovery.md`) adds,
inspects, and removes MCP servers over time.

## Scope

Management surface and lifecycle states. Protocol mechanics and trust
enforcement remain in `docs/06-tools/mcp.md`, which this document does
not restate or override.

## Lifecycle states

- **Discovered** — found via the plugin/MCP registry search
  (`docs/23-autonomy/autonomous-plugin-discovery.md`) or entered manually
  by URL; not yet connected.
- **Pending approval** — capability discovery has run
  (`docs/06-tools/mcp.md`) and the resulting tool list, with risk tiers,
  is shown to the user for explicit approval before any tool becomes
  callable.
- **Connected** — approved and active; its tools appear in the Tool
  Registry (`docs/06-tools/tool-registry.md`) exactly like any other tool
  source.
- **Disabled** — connection retained (credentials and configuration
  intact) but tools temporarily excluded from planning.
- **Removed** — connection and credential reference deleted.

## Management surface

Settings → MCP Servers lists every server in any of the above states,
showing: connection health (from the same `healthCheck()` mechanism as
any provider, per `docs/18-providers/provider-interface.md`), the tool
list with risk tiers, and last-invoked timestamps. This is the same
screen the Setup Wizard's "Add an MCP server" step writes into — there is
no separate first-run-only path.

## Autonomous addition

When NOVA proposes adding an MCP server on its own initiative (e.g., the
user asks for a capability NOVA doesn't have), the proposal surfaces in
this same management surface in the **Pending approval** state — NOVA
never auto-advances a self-discovered server past that gate, regardless
of how it was discovered. See
`docs/23-autonomy/autonomous-plugin-discovery.md` for the discovery flow
that produces these proposals.

## Related documents

- `docs/25-failure-modes/FM-07-tool-execution-and-mcp.md` — failure modes for this subsystem
- `docs/06-tools/mcp.md` — protocol, discovery, and trust boundary
- `docs/06-tools/tool-registry.md` — where connected servers' tools land
- `docs/23-autonomy/autonomous-plugin-discovery.md` — self-initiated
  discovery that feeds the Discovered/Pending states
- `docs/10-security/permission-escalation.md` — approval gate mechanics
