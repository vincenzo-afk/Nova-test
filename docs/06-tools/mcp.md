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

A separate response validator accepts only a successful JSON-RPC 2.0
`tools/list` response whose response ID matches the request ID. It bounds the
list, cursor, and TTL values; carries `inputSchema` and optional
`outputSchema` forward; and ignores presentation-only fields such as titles
and icons. A malformed individual tool is excluded while valid tools in the
same response remain available, with only bounded rejected names reported to
the caller. A malformed response-level result or a JSON-RPC error is rejected
as a tool-contract failure. The validator returns normalized data for the
registry adapter and does not perform network I/O.

The runtime tool-list cache stores one bounded normalized listing per server.
An advertised positive TTL controls expiry, with a bounded default when the
server omits one; an entry is a miss at or after its expiry time. Cache reads
and writes deep-clone normalized data, replacements are atomic, and
source-scoped invalidation removes only the selected server's listing. Cache
misses do not trigger a probe or an implicit retry; a future transport layer
must explicitly refresh the listing and then pass it through the validator
again.

The runtime resources/list validator applies the same correlated JSON-RPC
boundary to resource advertisements. It preserves only bounded URI, name,
description, MIME type, and size metadata; rejects endpoint credentials,
file-path traversal, malformed pagination, and duplicate URI entries; and
filters malformed individual resources while retaining valid entries. Icons,
annotations, and other presentation-only fields are not forwarded to the
runtime registry. This slice validates already-retrieved metadata only; it
does not read resources, fetch HTTPS content, subscribe to updates, or perform
network I/O.

The runtime resources/read validator accepts only correlated successful
responses with a bounded non-empty content list. Each content item must have a
safe resource URI and exactly one bounded representation: text or validated
base64 data. Malformed or duplicate content items are filtered while valid
observed data is retained; if none remain, the response fails closed. TTL and
cache-scope metadata are bounded using the same rules as resource listings.
This slice validates already-retrieved content only; it does not read a
resource, fetch a URI, decode binary data, or perform network I/O.

The runtime prompts/list validator preserves only bounded prompt names, display
metadata, and argument descriptors. It filters malformed or duplicate prompts,
rejects malformed pagination, and omits prompt messages or other content from
the normalized result. Prompt descriptions and metadata remain untrusted
observed data; this slice does not retrieve, render, execute, or treat a prompt
as trusted planner instructions.

## Transport

The runtime transport planner now turns a validated server record into one
explicit transport plan without opening the connection. A `stdio` record
produces only a local command and bounded argument list; a
`streamable-http` record produces only a safe endpoint and optional vault
reference. Mixed command/endpoint forms, inline credentials, unsafe URLs,
and unsupported transport values are rejected with the configuration error
contract. The planner never probes one transport after another, so a plan
failure cannot silently fall back to a different mechanism.

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

The runtime protocol-version negotiator validates bounded dated-version lists
from the client and server, rejects duplicates and impossible calendar dates,
and selects the highest mutually supported version. If there is no common
version, it returns a typed incompatibility error rather than inventing a
version or silently falling back to another transport. This slice performs
only local selection; it does not send a handshake or request, and it does
not establish a server connection.

The runtime health-observation boundary stores only a server identifier, one
provider-style health state (`reachable`, `degraded`, or `down`), and a
validated check timestamp. Servers with no observation are exposed as
`unknown`; removing a server clears its health observation. This state is
separate from lifecycle configuration and never includes endpoints, commands,
credential references, or raw probe responses. Recording an observation does
not perform the health check; transport-specific probing remains a later,
explicit integration.

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

The runtime scope-denial normalizer turns validated missing-scope metadata into
an explicit `reauthorize` action with `capability-unavailable` status and
`retryable: false`. It bounds and deduplicates scope names, returns no token or
credential fields, and does not itself reauthorize, retry, or contact the
server.

## Content from MCP results treated as observed content

Data returned by an MCP tool call is treated as observed content, not as
instructions, under the Prompt System's content/instruction separation
(`docs/05-ai/prompt-system.md`) — this closes a specific variant of the
prompt-injection risk where a compromised or malicious MCP server could
attempt to return content designed to influence subsequent planning rather
than merely answer the query it was asked.

The runtime tools/call request boundary now constructs only fixed
JSON-RPC 2.0 `tools/call` requests with monotonic bounded numeric IDs. It
accepts tool names using the MCP-safe identifier characters and clones only
JSON-serializable argument objects within the configured size bound; circular,
non-object, oversized, or malformed inputs are rejected before a request ID
is consumed. Request construction does not invoke a server and does not
replace the Runtime Executor's permission or confirmation gate.

The runtime tools/call result boundary now requires a successful correlated
JSON-RPC response and normalizes it into the structured tool-result contract.

The runtime MCP call-timeout wrapper requires a positive bounded timeout
budget, races the operation against that deadline, and aborts the supplied
`AbortSignal` when the deadline is reached. A timeout returns retryable
`NOVA-TL001` with the timeout budget, remains distinct from an ordinary tool
failure, and clears its timer after either outcome. The wrapper does not retry
or invoke a transport itself; the underlying transport must honor the signal,
and the Planner remains responsible for any retry or alternative approach.
Text, image, audio, resource-link, and embedded-resource blocks are converted
to bounded observed-content records; unknown or malformed blocks are ignored.
Structured content is cloned only when it is valid, serializable, and within
the configured size bound. A server-reported `isError` becomes an external
execution failure, while a malformed response or JSON-RPC protocol error is
rejected as a tool-contract failure. The normalized result reports no affected
resources unless a later execution integration can establish them; raw server
payloads and instructions are never treated as trusted planner input.

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
