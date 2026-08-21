# Secrets

## Purpose

Specifies how credentials for AI providers, MCP servers, and direct API
integrations are stored and resolved, implementing the firm rule
established throughout this repository: secrets never enter memory
databases and are never stored inline in configuration.

## Scope

Credential storage and resolution. Encryption of non-credential memory
data is `encryption.md`; authentication using resolved credentials is
`authentication.md`.

## Storage mechanism

Every credential — AI provider API keys (`docs/05-ai/model-providers.md`),
MCP server authentication (`docs/06-tools/mcp.md`), and direct API
integration credentials (`docs/06-tools/api.md`) — is stored in the
Windows Credential Manager, the OS-native secure credential store, never
in NOVA's own configuration files or any memory storage engine
(`docs/04-memory/memory-storage.md`).

## Reference-not-value pattern

Configuration entries for providers, MCP servers, and APIs store a
*reference* to a credential vault entry, never the credential value
itself:

```json
{
  "provider_id": "example-provider",
  "auth": { "vault_reference": "nova.providers.example-provider.api_key" }
}
```

This is the pattern referenced throughout `docs/05-ai/model-providers.md` and `docs/06-tools/mcp.md` — resolution happens at call time by looking up
the vault reference, and the resolved value is held only transiently in
memory for the duration of the call, never persisted or logged.

## Never appearing in logs or audit trail

The audit trail (`audit.md`) records that a call to a specific provider
or MCP server occurred, including its `correlation_id`, but never records
the credential value used — audit completeness (recording *what*
happened) and secrets protection (never recording *credential values*)
are both satisfied simultaneously by this separation.

## Rotation and revocation

Rotating a credential (updating the vault entry) takes effect on the
next resolution without requiring any change to NOVA's own configuration,
since configuration only ever stores the reference. Revoking a
credential entirely (removing the vault entry) causes the next resolution
attempt to fail cleanly, reported to the Model Router
(`docs/05-ai/model-router.md`) as that provider being unavailable, which
triggers normal fallback routing rather than a crash.

## Related documents

- `docs/25-failure-modes/FM-12-security-sandbox-identity.md` — failure modes for this subsystem
- `docs/05-ai/model-providers.md` — provider configuration using this
  reference pattern
- `docs/06-tools/mcp.md`, `docs/06-tools/api.md` — the other credential
  consumers
- `audit.md` — how credential *use* (not value) is recorded
