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

## Configuration boundary

MCP server records are stored as bounded local configuration with a unique
`server_id`, a bounded label, one lifecycle state from the list above, and
exactly one deterministic transport. A local server uses `transport: "stdio"`
with a command and optional bounded argument list; a remote server uses
`transport: "streamable-http"` with an HTTPS endpoint. HTTP is accepted only
for loopback development endpoints. Endpoint credentials are rejected, and
authentication may contain only a `vault://` reference. A server record cannot
mix the local command and remote endpoint forms. Configuration validation does
not connect to or discover a server; those remain separate approval-gated
protocol operations.

## Local lifecycle manager

The runtime exposes a local lifecycle manager for configured MCP records. A
new record must enter `Discovered`, then move to `Pending approval` before it
can become `Connected`. Connected records can be `Disabled` and later
re-enabled. Removal requires explicit confirmation and returns only a bounded
`{ server_id, state: "Removed" }` result; the stored credential reference is
not included in the removal result. Invalid transitions leave the prior state
unchanged. These transitions manage local configuration state only and do not
start a server process, open a network connection, enumerate tools, or bypass
the protocol-level approval gate.

## Desktop boundary

The desktop runtime exposes the local lifecycle operations through the
permission-first IPC path. Reads return only `server_id`, label, lifecycle
state, and transport. Add, approval-request, approve, disable, enable, and
remove operations carry an explicit boolean confirmation to the authoritative
runtime; the preload bridge appends these methods without changing the order
of existing public methods. Commands, arguments, endpoints, and vault
references remain in the main/runtime boundary and are not projected to the
renderer.

## Management surface

Settings → MCP Servers lists every server in any of the above states,
showing: connection health (from the same `healthCheck()` mechanism as
any provider, per `docs/18-providers/provider-interface.md`), the tool
list with risk tiers, and last-invoked timestamps. Normalized discovery
results use the `<server_id>.<tool_name>` registry namespace, carry a
validated optional output schema, and remain confirmation-required when the
advertisement omits verification metadata. A malformed individual
advertisement is excluded without discarding valid tools from the same
response.
This is the same screen the Setup Wizard's "Add an MCP server" step writes
into — there is no separate first-run-only path. The current runtime slice
only validates and registers an already-retrieved advertisement; it does not
perform the transport connection or health check.

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
