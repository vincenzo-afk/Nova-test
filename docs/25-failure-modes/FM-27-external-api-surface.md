# FM-27: NOVA's Own External API Surface (REST, WebSocket, SDK, Webhooks)

## Purpose

Catalogs failure modes specific to NOVA acting as the *server* for its
own public integration surface — the REST API, WebSocket API, public
SDK, external event/webhook subscriptions, and the versioning contract
that holds them together. This is the direction opposite
`FM-11-internet-and-external-apis.md` (NOVA as a *client* calling
external/internet services): here, NOVA is the thing being called into
by third-party applications, scripts, and integrations. This file closes
a gap identified during a documentation-consistency audit — `docs/08-api/rest-api.md` and `docs/08-api/versioning.md` were previously
(incorrectly) listed under `FM-11`'s scope before being removed there and
given their own coverage here.

## Scope & Related Documents

This file is part of `docs/25-failure-modes/`, the project-wide failure-mode catalog. It must be read alongside:

- `docs/08-api/rest-api.md` - `docs/08-api/websocket.md` - `docs/08-api/sdk.md` - `docs/08-api/internal-api.md` - `docs/08-api/schemas.md` - `docs/08-api/events.md` - `docs/08-api/versioning.md`

## Failure Catalog

| ID | Failure | Trigger Condition | Detection | Severity | Mitigation | Recovery |
|---|---|---|---|---|---|---|
| **FM-27-001** | Breaking change ships without a version bump | A field is renamed, removed, or its type/meaning changes without following `versioning.md`'s major-version-bump rule. | External SDK/integration test suite (if the consumer has one) fails; support reports from third-party integrators spike after a release. | High | Additive-only changes within a major version, enforced by a schema-diff check in CI comparing the new response schema against the previous major version's, per `docs/08-api/versioning.md`'s Compatibility rules. | Revert or re-release under a new major version with the deprecation window `versioning.md` requires; never patch a breaking change into an existing major version after the fact. |
| **FM-27-002** | Plugin tool silently disabled by an API change | A breaking change to the SDK's plugin-tool registration mechanism goes out without the deprecation window, per `versioning.md`'s "Why this matters for a project with plugin/tool registration" section. | A previously-working, unmodified plugin fails registration or invocation after an API update with no code change on the plugin's side. | High | Treat the SDK's plugin-registration surface as a first-class versioned contract, not an implementation detail exempt from the deprecation window. | Restore the previous major version's registration behavior for the remainder of its support window; notify affected plugin authors directly if identifiable. |
| **FM-27-003** | Rate limit starves a legitimate integration | A single external client's rate limit is set too conservatively relative to a legitimate integration's real usage pattern (e.g., a dashboard polling task status for many concurrent tasks). | Client-side 429 responses reported by a real integration operating within its documented, intended use. | Medium | Rate limits are per-authenticated-client and configurable, per `rest-api.md`'s Rate limiting section, not a single hardcoded global value; document the default and how to request an increase. | Raise that client's configured limit; if the default is systematically too low for common use, adjust the default itself, not just the one client. |
| **FM-27-004** | `correlation_id` not propagated end-to-end | A task submitted via REST does not carry its `correlation_id` all the way through to the audit trail, breaking the specific guarantee `rest-api.md`'s Request/response conventions section describes. | An audit-trail query for a REST-submitted task's `correlation_id` returns no matching internal events. | High | Every REST-submitted task's `correlation_id` is generated at submission and threaded through the internal message envelope unchanged, per `docs/02-architecture/communication-model.md`, never regenerated at any internal hop. | Treat as a documentation-and-reference-integrity-class defect in the implementation (not the docs) — trace where the ID is dropped and fix that specific hop; audit other entry points for the same class of bug. |
| **FM-27-005** | Webhook delivered without a valid signature, or signature check skipped | A webhook consumer fails to verify the per-registration signature `events.md`'s Security section requires, or NOVA itself fails to sign a payload due to an implementation bug. | A consumer-side security audit or a synthetic test webhook receiver detects an unsigned or incorrectly-signed delivery. | Critical | Signing is not optional or best-effort — every webhook delivery is signed before the HTTP POST is made, per `events.md`'s Security section; this is enforced at the delivery mechanism itself, not left to be remembered per call site. | Immediately disable the affected webhook registration pending investigation; rotate the per-registration secret; audit whether any unsigned deliveries were acted upon by the consumer. |
| **FM-27-006** | Webhook retried past the point of usefulness, or dropped silently | Delivery failures exhaust the configured retry/backoff count (`events.md`'s Delivery guarantees), and the registered webhook is flagged — but the flag isn't surfaced anywhere a user or the registering integration would see it. | A webhook consumer stops receiving events with no visible indication anywhere in the product that delivery has been failing. | Medium | The webhook's flagged-unhealthy state (per `events.md`) must be visible to the user who registered it — a REST endpoint to query webhook health, not just an internal log entry. | Surface the flagged state; allow the user to re-verify/re-enable the webhook once the underlying issue (e.g., an unreachable callback URL) is fixed. |
| **FM-27-007** | Internal API accidentally reachable by a non-UI process | `internal-api.md`'s UI-to-Gateway surface (which deploys in lockstep and is exempt from the external versioning policy) becomes reachable by a process other than the first-party UI process, due to a bug in the process-isolation enforcement. | A security review or an unexpected caller identity on an internal-API call finds a non-UI process successfully invoking it. | Critical | The internal API travels over the same Communication Bus as inter-service messages, via the API Gateway acting as the bus-facing endpoint for the UI process — the UI process itself has no direct bus access, per `docs/02-architecture/system-architecture.md`'s process-isolation model; this is enforced at the bus/process boundary, not a network port binding, since the internal API was never described as a separate network listener in the first place. | Treat as a security incident per `docs/10-security/threat-model.md`; audit for any unauthorized access that occurred; fix the process-isolation gap and add a startup/runtime check that rejects any internal-API caller identity other than the UI process. |

## Related documents

- `docs/25-failure-modes/FM-11-internet-and-external-apis.md` — the
  opposite direction (NOVA as a client calling external services)
- `docs/02-architecture/communication-model.md` — the internal message
  envelope `correlation_id` originates from
- `docs/10-security/threat-model.md` — the security model FM-27-007
  escalates against
