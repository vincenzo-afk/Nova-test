# Model Providers

## Purpose

Specifies the plug-in abstraction that lets NOVA support multiple AI
providers and local models through configuration rather than hardcoding,
per the "fully open source, no vendor lock-in" decision in
`docs/01-product/project-scope.md`.

## Scope

Provider configuration schema and connection management. Which provider
gets selected for a given call is `model-router.md`.

## Provider configuration schema

Every configured provider declares:

```json
{
  "provider_id": "string",
  "endpoint": "string (URL, or 'local' for on-device models)",
  "auth": "reference to OS credential vault entry, never inline",
  "model_list": ["array of model identifiers this provider exposes"],
  "capabilities": {
    "tool_calls": "boolean",
    "vision_input": "boolean",
    "streaming": "boolean",
    "max_context_tokens": "integer"
  },
  "rate_limits": { "requests_per_minute": "integer", "tokens_per_minute": "integer" },
  "cost_per_1k_tokens": { "input": "number", "output": "number" },
  "privacy_class": "local | cloud"
}
```

This schema is what the Model Router (`model-router.md`) filters and
ranks against — adding a new provider means adding a configuration entry,
not changing routing code.

## Local model support

Local models are configured with `endpoint: "local"` and `privacy_class: "local"`, and are treated as first-class citizens in the routing
algorithm, not a degraded fallback — per
`docs/00-overview/non-goals.md`'s local-first commitment, full offline
operation depends on local models being genuinely equivalent participants
in provider selection, not merely available as a last resort when cloud
providers are unreachable.

## Secrets handling

Per `docs/10-security/secrets.md` (Tier 3), authentication credentials for
any configured provider are never stored inline in this configuration —
the `auth` field is always a reference to an entry in the OS credential
vault (Windows Credential Manager), resolved at call time.

## Adding a new provider

Adding support for a new provider requires: a configuration entry
matching the schema above, and, if the provider has a non-standard API
shape, a thin adapter translating between NOVA's internal call format and
that provider's API — no change to the Model Router's selection logic
itself, since it operates only against the declared schema fields, not
provider-specific implementation detail.

## Capability mismatch handling

If a routing decision requires a capability (e.g., tool calls) that the
otherwise-preferred provider does not declare, that provider is filtered
out at the capability-filter stage of `model-router.md`'s algorithm — a
call is never sent to a provider incapable of fulfilling it and silently
degraded; the router selects a capable alternative or reports no
available provider.

## Related documents

- `docs/25-failure-modes/FM-04-model-router-provider-fallback.md` — failure modes for this subsystem
- `model-router.md` — the selection logic operating over this
  configuration
- `docs/10-security/secrets.md` (Tier 3) — credential vault integration
- `docs/00-overview/non-goals.md` — the local-first, no-vendor-lock-in
  commitment this abstraction implements
