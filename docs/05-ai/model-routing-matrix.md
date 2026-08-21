# Model Routing Matrix

## Purpose

Presents the Model Router's routing rules (`docs/05-ai/model-router.md`)
as a concrete table rather than prose alone. **This table is structured
around task type → required capability, not around fixed vendor names**
— NOVA is deliberately provider-agnostic (ADR-0004,
`docs/15-decisions/adr-0004-ai.md`) and user-configurable, so hardcoding
"coding tasks always route to Provider X" would misstate the actual
architecture. The example provider column shows one illustrative
configuration, not an architectural commitment.

## Scope

Routing rule structure and a worked example configuration. The
deterministic algorithm that evaluates this table at call time is
`docs/05-ai/model-router.md`.

## Routing table structure

| Task type | Required capability | Latency sensitivity | Example provider (user-configurable) | Fallback order |
|---|---|---|---|---|
| Code-related reasoning | `tool_calls`, strong code understanding | Medium | Whichever configured provider declares strongest code capability | Next-best code-capable provider → local model |
| Vision parsing (`docs/06-tools/vision.md`) | `vision_input` | Low (interactive) | Whichever configured provider declares `vision_input: true` | Next vision-capable provider → fail step, escalate to Accessibility tier if not yet attempted |
| Long-context synthesis (e.g., summarizing many files) | Large `max_context_tokens` | Low | Whichever configured provider has the largest context window meeting cost budget | Next-largest context window → chunked/compressed fallback per `docs/05-ai/context-builder.md` |
| Local-only / privacy-required | `privacy_class: local` | Varies | The user's configured local model | No cloud fallback — privacy-required calls never fall back to a cloud provider, per `docs/05-ai/model-providers.md` |
| Fast, low-stakes classification (e.g., is this an installer file) | Minimal — any capable model | High | Smallest/cheapest configured model meeting the quality bar | Next-cheapest capable model → deterministic heuristic if available, per `docs/05-ai/deterministic-first.md` |
| Embedding generation | Embedding support | Low | Configured embedding model, local by default | Next configured embedding provider |

## How "example provider" resolves at runtime

The Model Router (`docs/05-ai/model-router.md`) evaluates this table's
**required capability** column against the actual configured providers
(`docs/05-ai/model-providers.md`) at call time — the specific provider
selected depends entirely on what the user has configured, their cost/
privacy preferences, and current availability, not a value hardcoded in
this document. This table exists to make the *shape* of the routing
decision concrete (what factors matter, in what priority) for
implementers, not to fix specific vendor choices into the architecture.

## Fallback chain evaluation

Per `docs/05-ai/model-router.md`, a fallback is attempted only when the
currently-selected provider is unavailable or fails
(`docs/03-runtime/failure-recovery.md`'s Transient/External categories),
evaluated in the "Fallback order" column above, stopping at the first
available, capable, budget-compliant provider — never silently falling
back to a provider that does not meet the call's required capability,
even if it is cheaper or faster.

## Related documents

- `docs/25-failure-modes/FM-04-model-router-provider-fallback.md` — failure modes for this subsystem
- `docs/05-ai/model-router.md` — the algorithm evaluating this table
- `docs/05-ai/model-providers.md` — the provider configuration this table
  is evaluated against
- `docs/15-decisions/adr-0004-ai.md` — the provider-agnostic decision
  this table's structure respects
