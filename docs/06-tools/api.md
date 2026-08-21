# API (Execution Tier 3)

## Purpose

Describes direct API calls to an application or service's official
interface as an execution tier — distinct from MCP (tier 4), which is a
standardized protocol layer, and from CLI (tier 5), which shells out to a
command-line program.

## Scope

Direct-API-specific mechanics. General tier-ordering rules are
`execution-priority.md`.

## What belongs in this tier

Any application or service that exposes a documented, official API NOVA
can call directly — a local application's automation API, a web
service's REST/GraphQL API, or an SDK provided by the application vendor
— used in preference to MCP or CLI when a direct integration already
exists, since a direct API call typically has the lowest latency and the
most precise, application-defined verification signal among the
non-native tiers.

## Why this ranks above MCP and CLI

A direct API call goes through the target application's own official,
documented interface, typically including whatever authorization and
input-validation the application itself enforces — this is the same
reason APIs rank above CLI and MCP: the application vendor's own safety
and correctness checks are still in effect, unlike UI automation, which
bypasses them entirely.

## Authentication

API credentials are stored in the OS credential vault
(`docs/10-security/secrets.md`, Tier 3) exactly as MCP and provider
credentials are, resolved at call time and never inlined into tool
configuration or logs.

## Verification signal

The application's own API response — a status code, a returned resource
identifier, an explicit success/failure field in the response body — is
the primary verification signal, captured in the structured result's
`evidence` field per `tool-interface.md`.

## Rate limiting and retry

API tools respect the target service's documented rate limits
(tracked per registered tool, similar to the rate-limit fields in
`docs/05-ai/model-providers.md`'s provider schema) and apply bounded
retry with backoff on transient failures (e.g., HTTP 429/503) before
reporting the step as failed to the Planner.

## Related documents

- `docs/25-failure-modes/FM-07-tool-execution-and-mcp.md` — failure modes for this subsystem
- `execution-priority.md` — this tier's place in the overall chain
- `tool-interface.md` — the structured result contract API tools populate
- `docs/10-security/secrets.md` (Tier 3) — credential handling
