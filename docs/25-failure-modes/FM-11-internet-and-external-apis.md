# FM-11: Internet Connectivity & External APIs

## Purpose

The failure modes of the network itself and of every third-party API NOVA depends on.

## Scope & Related Documents

This file is part of `docs/25-failure-modes/`, the project-wide failure-mode catalog. It must be read alongside:

- `docs/18-providers/credential-management.md` - `docs/21-channels/calendar-assistant.md` - `docs/21-channels/email-assistant.md` - `docs/21-channels/messaging-platforms.md` - `docs/21-channels/phone-calls.md`

**Note:** `docs/08-api/rest-api.md` and `docs/08-api/versioning.md` were
previously listed here in error. This file's entire failure catalog
concerns NOVA acting as a *client* calling external/internet APIs (DNS,
TLS, rate limits, third-party breaking changes); `docs/08-api/` documents
the opposite direction — NOVA's own API surface that external SDK/CLI
clients call *into*. That direction is now covered by
`docs/25-failure-modes/FM-27-external-api-surface.md`.

## Failure Catalog

Each failure is assigned a stable ID (`FM-11-0XX`) for cross-referencing from code comments, incident reports, and other failure-mode files.

| ID | Failure | Trigger Condition | Detection | Severity | Mitigation (prevent) | Recovery (respond) |
|---|---|---|---|---|---|---|
| **FM-11-001** | No internet | Device has no network connectivity at all. | All outbound requests fail at the connection stage, including basic connectivity probes. | High | Detect true offline state distinctly from a single API being down; switch to fully offline-capable mode where possible. | Queue non-urgent requests; use local/cached capabilities per `docs/18-providers/provider-routing.md`'s Offline Fallback section until connectivity returns. |
| **FM-11-002** | DNS failure | DNS resolution fails for a specific or all hostnames. | Resolution error distinct from connection-refused/timeout. | Medium | Fall back to a secondary DNS resolver; cache last-known-good IPs for critical endpoints with a bounded TTL. | Retry resolution with a fallback resolver before declaring the endpoint unreachable. |
| **FM-11-003** | Slow network | High latency degrades responsiveness without outright failing. | Latency metrics exceed a soft threshold without hard errors. | Low | Adaptive timeout budgets and progress indicators rather than a fixed short timeout that misclassifies slow-but-working as failed. | No hard recovery needed; surface a 'working, slower than usual' state rather than silently hanging. |
| **FM-11-004** | Proxy issue | Corporate/system proxy misconfigured or requires auth NOVA doesn't have. | Connection fails specifically at the proxy layer (407 errors, proxy-specific timeouts). | Medium | Detect proxy-specific failure signatures distinctly from general network failure for clearer diagnostics. | Surface a proxy-configuration-needed message rather than a generic network error. |
| **FM-11-005** | SSL/TLS failure | Certificate expired, hostname mismatch, or untrusted CA. | TLS handshake failure with a specific certificate-related error. | High | Never silently downgrade or bypass TLS verification to work around this; treat as a hard stop requiring investigation. | Surface the specific certificate problem; do not proceed with an insecure connection as a workaround. |
| **FM-11-006** | API timeout | External API accepts the connection but doesn't respond in time. | Request exceeds the configured timeout with no response. | Medium | Per-API timeout budgets tuned to that API's known latency profile, not one global default. | Retry per the API's documented idempotency guarantees; otherwise surface to the caller as timeout, not failure. |
| **FM-11-007** | Rate limit | API returns 429 or equivalent. | Explicit rate-limit status code/header in the response. | Medium | Respect and parse `Retry-After` headers; implement token-bucket client-side throttling proactively, not just reactively. | Back off per the API's guidance and retry; if persistent, reduce request frequency at the source. |
| **FM-11-008** | Service unavailable | API returns 503 or is in a maintenance window. | 5xx status with service-unavailable semantics. | Medium | Circuit breaker (same pattern as FM-04-019) to stop hammering a known-down service. | Fall back or queue per the circuit breaker's configured behavior; retry once the circuit resets. |
| **FM-11-009** | Invalid token / expired key | Credential expired or was revoked. | 401/403 response referencing authentication specifically. | High | Proactive credential-expiry monitoring with renewal before expiry where the provider supports it (`docs/18-providers/credential-management.md`). | Prompt for re-authentication; do not silently drop the capability without informing the user why. |
| **FM-11-010** | Quota exceeded | Usage-based quota exhausted for the billing period. | 429/402-class error referencing quota specifically, distinct from rate-limiting. | Medium | Track quota consumption proactively and warn before exhaustion, not just react to the hard failure. | Fall back to an alternate provider/tier; alert the account owner with concrete usage numbers. |
| **FM-11-011** | Wrong endpoint (API) | Deprecated or incorrect endpoint URL used. | 404 or deprecation-warning response. | Low | Centralized, versioned endpoint configuration validated at build time. | Update to the correct/current endpoint; monitor for deprecation notices proactively going forward. |
| **FM-11-012** | Breaking changes (API) | Third-party API changes its contract (field renamed/removed, semantics changed) without NOVA being updated. | Response schema validation starts failing for previously-working calls, or values are subtly wrong post-change. | High | Schema-validate every external API response, not just happy-path field access; subscribe to the provider's changelog/deprecation notices where available. | Pin to the last known-good API version if the provider supports versioning; otherwise patch the integration promptly and add a regression test for the specific change. |
| **FM-11-013** | Malformed response | API returns technically-200 but structurally invalid JSON/data. | Parse failure despite a success status code. | Medium | Never assume a 200 status implies a valid body; validate structure independently. | Treat as a failure requiring retry/fallback, not a silent partial success. |
| **FM-11-014** | Authentication failed | Auth flow itself breaks (OAuth redirect misconfigured, refresh-token flow broken). | Auth handshake fails distinctly from a simple expired-token case. | High | Test the full auth flow (not just token validity) as part of health checks. | Guide the user through re-authentication from scratch if the refresh flow itself is broken, not just the token. |

## Compounding Failures

Notes on how failures in this file interact with failures elsewhere in this catalog — read these before assuming a bug is isolated to one subsystem.

- Rate limiting and quota exhaustion look identical to a hard outage from the caller's perspective unless the error is parsed specifically — always distinguish 'retry later' failures from 'never going to work as configured' failures so the fallback engine (FM-04) doesn't waste retries on the latter.

## Severity Legend

- **Critical** — data loss, security compromise, or user-visible harm; requires an incident-response runbook, not just a bug ticket.
- **High** — silent incorrectness, significant user-visible breakage, or a failure that blocks task completion with no graceful degradation.
- **Medium** — degraded quality/UX or a failure with a working but imperfect fallback.
- **Low** — cosmetic, rare, or fully recoverable with negligible user impact.
