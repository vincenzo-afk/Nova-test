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

The typed `server/discover` request builder constructs a fixed JSON-RPC 2.0
request with a monotonic bounded ID and the required modern per-request metadata:
a bounded protocol version, client name and version, and cloned capability
settings. Unknown fields are not forwarded, malformed metadata fails closed before
an ID is consumed, and the request size is bounded. This local boundary does not
perform discovery, negotiate a version, contact a server, invoke a transport, or
fall back to the legacy `initialize` handshake.

The runtime `server/discover` response validator accepts only a correlated
successful JSON-RPC 2.0 result with `resultType: complete` and a bounded,
unique supported-version list. It clones bounded capability settings, optionally
retains server-reported name/version, instructions, and public/private cache
hints, and discards unknown metadata. Server identity and instructions remain
self-reported observed data and never alter security or planner behavior. This
validator processes already-retrieved data only; it does not perform discovery,
version negotiation, caching, transport I/O, or legacy-handshake fallback.

The runtime server-discovery cache stores one bounded normalized discovery result
per validated server. It applies the advertised positive TTL or a bounded
default, deep-clones capabilities and metadata on write and read, replaces
entries atomically, and returns a server-scoped miss when an entry is absent or
expired. Duplicate versions, oversized capability data, malformed server
metadata, invalid server IDs, and invalid cache hints fail closed without
mutating valid state. Cache misses never trigger discovery, version negotiation,
transport connection, health probing, or network I/O; a future connection layer
must explicitly obtain and validate fresh discovery data.

The typed tools/list request builder constructs fixed JSON-RPC 2.0 requests
with monotonic bounded IDs and an optional bounded opaque pagination cursor.
Unknown option fields are not forwarded, and malformed or oversized cursors fail
closed before an ID is consumed. Building a request does not discover tools,
contact a server, or perform transport I/O.

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

The typed resources/list request builder constructs fixed JSON-RPC 2.0
requests with monotonic bounded IDs and an optional bounded opaque pagination
cursor. Unknown option fields are not forwarded, and malformed or oversized
cursors fail closed before an ID is consumed. Building a request does not
discover resources, contact a server, or perform transport I/O.

The runtime resources/list validator applies the same correlated JSON-RPC
boundary to resource advertisements. It preserves only bounded URI, name,
description, MIME type, and size metadata; rejects endpoint credentials,
file-path traversal, malformed pagination, and duplicate URI entries; and
filters malformed individual resources while retaining valid entries. Icons,
annotations, and other presentation-only fields are not forwarded to the
runtime registry. This slice validates already-retrieved metadata only; it
does not read resources, fetch HTTPS content, subscribe to updates, or perform
network I/O.

The runtime resource-list cache stores one bounded normalized resource listing
per validated server. It applies the advertised positive TTL or a bounded
default, deep-clones values on write and read, replaces listings atomically, and
returns a server-scoped miss when an entry is absent or expired. Malformed
server IDs or resource metadata fail closed without mutating a valid entry;
misses never trigger resource discovery, refresh, reads, URI fetches,
subscription, or transport I/O, and a future connection layer must explicitly
obtain and validate fresh metadata.

The runtime resource-list update invalidator combines a validated
`notifications/resources/list_changed` signal with the local resource-list cache
and removes only the affected server’s listing. Tool and prompt list-change
signals, malformed notifications, and invalid server identities fail closed
without mutating the cache. Invalidation does not rediscover resources, refresh
a listing, read or fetch a URI, open a subscription, contact a transport, or
perform network I/O.

The runtime resources/read validator accepts only correlated successful
responses with a bounded non-empty content list. Each content item must have a
safe resource URI and exactly one bounded representation: text or validated
base64 data. Malformed or duplicate content items are filtered while valid
observed data is retained; if none remain, the response fails closed. TTL and
cache-scope metadata are bounded using the same rules as resource listings.
This slice validates already-retrieved content only; it does not read a
resource, fetch a URI, decode binary data, or perform network I/O.

The runtime resource-read cache stores normalized results per validated server
and resource URI. It applies a bounded positive TTL, deep-clones values on
write and read, replaces all cached content for a URI atomically, and supports
source-and-URI-scoped invalidation. Expired or missing entries return a bounded
miss and never trigger a fetch, refresh, subscription, or transport operation;
a future transport layer must explicitly retrieve and validate fresh content.

The typed resources/read request builder constructs only fixed JSON-RPC 2.0
requests with monotonic bounded IDs, a safe resource URI, and optional cloned,
bounded `inputResponses` and `requestState` values. Unknown option fields,
unsafe URIs, oversized state, and malformed input responses fail closed before
an ID is consumed. Building a request does not read a resource, expand a URI
template, contact a server, or bypass the Runtime Executor's permission and
confirmation gates.

The typed resources/templates/list request builder constructs fixed JSON-RPC
2.0 requests with monotonic bounded IDs and an optional bounded opaque pagination
cursor. Unknown option fields are not forwarded, and malformed or oversized
cursors fail closed before an ID is consumed. Building a request does not
discover templates, contact a server, or perform transport I/O.

The runtime resources/templates/list validator preserves only bounded URI
templates, names, display metadata, MIME types, and pagination/cache metadata.
It rejects malformed URI templates, endpoint credentials, file-path traversal,
duplicate names or templates, and malformed response-level metadata while
retaining valid siblings. URI templates remain observed server metadata; this
slice does not expand variables, autocomplete arguments, read a resolved
resource, subscribe to updates, or perform network I/O.

The runtime resources/templates/list cache stores one bounded normalized
resource-template listing per validated server. It applies the advertised
positive TTL or a bounded default, deep-clones values on write and read,
replaces listings atomically, and returns a server-scoped miss when an entry is
absent or expired. Malformed server IDs or template metadata fail closed without
mutating a valid entry; misses never trigger template discovery, expansion,
autocomplete, resource reads, subscription, or transport I/O, and a future
connection layer must explicitly obtain and validate fresh metadata.

The runtime resource-template list invalidator combines a validated
`notifications/resources/list_changed` signal with the local resource-template
cache and removes only the affected server’s template listing. Tool and prompt
list-change signals, malformed notifications, and invalid server identities fail
closed without mutating the cache. Invalidation does not rediscover templates,
expand variables, autocomplete arguments, read or fetch a resource, open a
subscription, contact a transport, or perform network I/O.

The typed prompts/list request builder constructs fixed JSON-RPC 2.0 requests
with monotonic bounded IDs and an optional bounded opaque pagination cursor.
Unknown option fields are not forwarded, and malformed or oversized cursors fail
closed before an ID is consumed. Building a request does not discover prompts,
contact a server, or perform transport I/O.

The runtime prompts/list validator preserves only bounded prompt names, display
metadata, and argument descriptors. It filters malformed or duplicate prompts,
rejects malformed pagination, and omits prompt messages or other content from
the normalized result. Prompt descriptions and metadata remain untrusted
observed data; this slice does not retrieve, render, execute, or treat a prompt
as trusted planner instructions.

The runtime prompt-list cache stores one bounded normalized prompt listing per
validated server. It applies the advertised positive TTL or a bounded default,
deep-clones values on write and read, replaces entries atomically, and returns a
server-scoped miss when an entry is absent or expired. Malformed server IDs or
prompt metadata fail closed without mutating an existing entry; misses never
trigger prompt discovery, refresh, retrieval, rendering, execution, or transport
I/O, and a future connection layer must explicitly obtain and validate fresh
metadata.

The runtime prompt-list update invalidator combines a validated
`notifications/prompts/list_changed` signal with the local prompt cache and
removes only the affected server’s prompt listing. Tool and resource list-change
signals, malformed notifications, and invalid server identities fail closed
without mutating the cache. Invalidation does not rediscover prompts, refresh a
listing, retrieve or render prompt messages, execute a prompt, open a transport,
or perform network I/O.

The typed prompts/get request builder constructs fixed JSON-RPC 2.0 requests
with monotonic bounded IDs, safe prompt names, cloned bounded string arguments,
and optional bounded input-response state. Unknown fields and malformed or
oversized values fail closed before an ID is consumed. Building a request does
not retrieve or render prompt messages, treat server content as trusted
instructions, contact a server, or bypass the Runtime Executor's permission and
confirmation gates.

The runtime prompts/get response validator requires a correlated successful
response with a bounded non-empty message list. It retains only `user` or
`assistant` roles and bounded text, validated base64 image/audio data, safe
resource links, or safe embedded resources as `observed: true` content. Invalid
messages are filtered while valid siblings remain; if none remain, the response
fails closed. Prompt descriptions are bounded metadata, and prompt content is
never promoted to trusted planner instructions. This slice does not retrieve,
render, execute, or forward messages to a model, and performs no network I/O.

The runtime list-changed notification classifier accepts only JSON-RPC 2.0
notifications for `notifications/tools/list_changed`,
`notifications/resources/list_changed`, or
`notifications/prompts/list_changed`. It returns only the affected capability
and fixed method identity, discarding notification parameters and rejecting
responses, malformed messages, unsupported methods, and oversized payloads.
Classification is only an observed invalidation signal; it does not refresh a
listing, open a transport, subscribe to updates, or perform network I/O. A future authoritative connection/cache layer must decide whether and how to
refresh after approval and capability checks.

The runtime tool-list update invalidator combines a validated
`notifications/tools/list_changed` signal with the local tool cache and removes
the affected server’s listing. Resource and prompt list-change signals are not
accepted by this tool-cache boundary. Invalid notifications and invalid server
identities fail closed without mutating cached tools; invalidation does not
rediscover tools, refresh a listing, open a transport, or perform network I/O.

The runtime resource-updated notification classifier accepts only a JSON-RPC 2.0
`notifications/resources/updated` notification containing a safe resource URI.
It returns only the fixed method identity and URI, discarding subscription and
server metadata and rejecting malformed, credential-bearing, traversal, or
oversized values. Classification is only an observed update signal; it does not
subscribe, refresh a resource, fetch its URI, or perform network I/O.

The runtime resource-update invalidator combines that validated notification
with the local resource cache and removes only the notified server-and-URI
entry. Invalid notifications and invalid server identities fail closed without
mutating the cache. Invalidation does not fetch replacement content, refresh a
listing, open a subscription, or contact a transport.

The runtime progress-notification classifier accepts only a JSON-RPC 2.0
`notifications/progress` notification with a bounded string or safe integer
progress token, a finite non-negative progress value, and optional bounded total
and human-readable message fields. It returns only those normalized fields and
filters unknown server metadata. This is an observed-message boundary only: it
does not verify that the token belongs to an active request, enforce increasing
progress across notifications, track completion, maintain a stream, or perform
network I/O.

The runtime progress-state tracker applies already classified progress to a
bounded server-and-token-local snapshot. It preserves the latest message and
total when omitted by a later update, rejects regressions and progress beyond a
reported total, and returns a scoped miss for unknown tokens. Malformed server
identities or notifications fail closed without mutating prior state. This
boundary does not track request ownership, infer completion, maintain a stream,
reconnect, contact a transport, or perform network I/O.

The runtime cancellation-notification classifier accepts only a JSON-RPC 2.0
`notifications/cancelled` notification with a bounded string or safe integer
request ID and an optional bounded reason. It returns only the normalized request
ID and reason, discarding unknown metadata and rejecting response-shaped or
malformed messages. This slice does not look up an active request, stop work,
close a subscription stream, or perform network I/O; an authoritative lifecycle
owner must apply cancellation semantics and race handling.

The runtime elicitation-request validator accepts an `elicitation/create` request
with a bounded human-readable message and either form mode or HTTPS URL mode.
Omitted mode defaults to form; form requests require a bounded cloned object
schema, while URL requests reject non-HTTPS URLs and embedded URL credentials.
Unknown request fields are discarded. Server-provided schemas, messages, and URLs
remain untrusted observed data: this slice does not render a UI, collect or
expose credentials, open a URL, obtain consent, validate submitted content, or
perform network I/O. A future interaction owner must provide explicit user review,
decline/cancel controls, and secure URL navigation.

The runtime elicitation-response validator accepts only an `accept`, `decline`,
or `cancel` action with optional bounded object content and clones that content
before returning it. It preserves explicit user-action semantics but does not
validate content against a request schema, submit a response, grant consent,
navigate to a URL, expose secrets, or perform network I/O. A future interaction
owner must apply the requested form or URL policy and associate responses with
the originating operation.

The runtime MRTR `input_required` result validator accepts only a correlated
successful JSON-RPC 2.0 result with a bounded request ID, at least one of a
validated elicitation-request map or opaque bounded request state, and no
unsupported input-request types. Elicitation map keys are bounded and the
nested requests pass through the elicitation validator; request state is retained
as an opaque string and is never parsed or modified. This boundary does not
retry the original request, satisfy input requests, render UI, apply consent,
interpret request state, or perform network I/O.

The typed subscriptions/listen request builder constructs fixed JSON-RPC 2.0
requests with monotonic bounded IDs and an explicit notification filter. It
accepts only supported list-change flags and bounded, unique safe resource URIs,
rejects empty filters and malformed values before consuming an ID, and clones
resource-subscription data. Request construction does not open a long-lived
stream, subscribe a server, contact a transport, or bypass approval and
capability checks.

The runtime subscription acknowledgment validator accepts only the correlated
`notifications/subscriptions/acknowledged` JSON-RPC notification. It retains a
bounded subscription ID and the server's supported subset of list-change flags
or safe resource URIs, while discarding other `_meta` and notification fields.
It fails closed on missing correlation, malformed filters, unsafe or duplicate
resource URIs, and invalid values. This slice does not open, maintain, cancel,
or reconnect a stream and does not perform network I/O.

The runtime subscription-filter negotiator accepts an already validated local
request filter and acknowledgment, returns only the acknowledged subset that
was explicitly requested, clones resource subscriptions, and rejects
unrequested event flags or resource URIs. Malformed filters and acknowledgments
fail closed. This boundary performs no subscription, stream maintenance,
cancellation, reconnection, transport send, or network I/O; an authoritative
connection layer must own those effects after approval and capability checks.

The typed `notifications/cancelled` builder constructs the JSON-RPC 2.0
cancellation notification for a bounded string or safe integer request ID. It
forwards no extra fields and performs no transport send, stream shutdown, or
subscription-state mutation; an authoritative connection layer must own those
side effects after the appropriate approval and lifecycle checks.

The runtime subscriptions/listen completion validator accepts only a successful
JSON-RPC 2.0 response with `resultType: complete`. It requires a bounded request
ID and matching `io.modelcontextprotocol/subscriptionId`, returning only their
correlation and the fixed completion type while discarding other result metadata.
It fails closed on mismatched or malformed correlation and oversized payloads.
This slice does not close or reconnect a stream and performs no transport I/O.

The runtime subscription-state registry stores bounded negotiated subscription
records by validated server and subscription ID, deep-clones notification
filters on registration and lookup, and removes only an active server-scoped
record after a validated matching completion response. A validated inbound
`notifications/cancelled` message can likewise remove only its matching active
server-scoped record. Unknown completions or cancellations, malformed records,
invalid IDs, and invalid server identities fail closed without mutating active
state. This local ledger does not open or close streams, send cancellation,
reconnect, contact a transport, or perform network I/O.

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

The runtime MCP tool-discovery boundary registers an already validated
advertisement batch into the Tool Registry only as a batch. Nested input and
output schemas are deep-cloned before exposure so caller-owned observed data
cannot mutate registered metadata. If a later registry registration fails,
entries registered earlier in that batch are removed before the failure is
returned. This preserves the no-partial-exposure invariant while leaving
unrelated registry sources untouched; registration consumes observed data and
performs no server contact or transport I/O.

The runtime health-observation boundary stores only a server identifier, one
provider-style health state (`reachable`, `degraded`, or `down`), and a
validated check timestamp. Servers with no observation are exposed as
`unknown`; removing a server clears its health observation. This state is
separate from lifecycle configuration and never includes endpoints, commands,
credential references, or raw probe responses. Storage is bounded to 128
server observations: existing servers may be updated at capacity, while a
new server observation is rejected without mutation once the limit is reached.
Recording an observation does not perform the health check; transport-specific
probing remains a later, explicit integration.

The local MCP tool-discovery boundary can replace one server’s normalized Tool
Registry source atomically. It validates the complete incoming advertisement
batch and checks registry invariants before removing the server’s prior tools;
if a subsequent registry registration fails, the prior source entries are
restored. Source deregistration applies the same rollback rule if a later
registry removal fails. Replacement and deregistration are scoped to the server
namespace and never overwrite another source’s entries. These operations
consume already observed data only; they do not connect to a server, retrieve
advertisements, invoke tools, or perform transport or network I/O.

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
is consumed. The builder also supports bounded MRTR retry fields: cloned
elicitation responses under `inputResponses` and an opaque bounded `requestState`;
unknown fields and malformed retry data fail closed. Request construction does not
invoke a server, retry an operation, interpret request state, or replace the
Runtime Executor's permission or confirmation gate.

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
