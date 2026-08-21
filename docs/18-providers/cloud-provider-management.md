# Cloud Provider Management

## Purpose

Specifies how cloud-backed providers — for any capability domain, not
just LLMs — are added, authenticated, rate-limited, and cost-tracked.

## Scope

Cloud provider lifecycle and cost/rate accounting. Credential storage
mechanics are `credential-management.md`; selection among enabled
providers is `provider-routing.md`.

## Adding a cloud provider

A cloud provider is added by supplying: an endpoint, an auth reference
(never an inline key — see `credential-management.md`), and its
`describe()`-reported capabilities and rate limits (per
`provider-interface.md`). NOVA ships adapters for common OpenAI-compatible
and vendor-specific APIs across each domain, and supports user-added
custom endpoints for any domain following the same interface — a
self-hosted inference endpoint is configured identically to a commercial
API.

## Rate limiting and backpressure

Each cloud provider's configured `requests_per_minute` /`tokens_per_minute` (or domain-equivalent) is enforced client-side before
a request is sent, so NOVA fails gracefully with a queued/backoff state
rather than discovering a 429 after the fact. Backpressure state is
visible in the Task Monitor UI (`docs/09-ui/task-monitor.md`) so a
long-running background task that's rate-limited reads as "waiting on
provider," not "stuck."

## Cost tracking

Every cloud invocation is metered against the provider's declared
`cost_per_1k_tokens` (or per-domain equivalent, e.g., per-minute for
speech, per-image for vision) and rolled up into
`docs/23-autonomy/personal-analytics.md`'s usage view. Users can set a
soft budget per capability or per provider; crossing it surfaces a
non-blocking warning, and an optional hard cap that switches routing to a
local/free provider (if one is enabled) or pauses the capability until
acknowledged.

## Multi-account and workspace credentials

A single cloud provider (e.g., a given LLM vendor) may have multiple
configured accounts — personal and work, for instance — each a distinct
`provider_id` instance with its own credential reference and its own
rate/cost tracking, selectable per task or by default policy.

## Health and outage handling

`healthCheck()` failures are distinguished between transient (network
blip — retry with backoff) and structural (auth expired, endpoint
deprecated — surface to the user for action, don't silently keep
retrying). Provider-reported deprecation notices are surfaced in Settings
as an actionable item.

## Related documents

- `docs/25-failure-modes/FM-04-model-router-provider-fallback.md` — failure modes for this subsystem
- `credential-management.md` — how auth material is stored and resolved
- `provider-routing.md` — cost-optimized and privacy-first policies that
  read the fields this doc populates
- `docs/23-autonomy/personal-analytics.md` — user-facing usage rollups
