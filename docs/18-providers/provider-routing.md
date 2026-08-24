# Provider Routing Policies

## Purpose

Generalizes `docs/05-ai/model-router.md`'s filter/rank/select algorithm
from "which LLM provider" to "which provider, for any capability domain."
This is the component that turns a Capability Registry entry with
multiple enabled providers into a single provider chosen for a given
call.

## Scope

Routing policy types, fallback-chain behavior, and hybrid local/cloud
execution. Provider configuration itself is `capability-management.md`.

## Policy types

Each capability can be set to one routing policy:

- **privacy-first** — always prefer the highest-ranked provider with
  `privacy_class: local`; only fall through to `cloud` if no local
  provider is enabled or healthy. This is the default for any capability
  touching raw personal data (microphone audio, screen/camera frames,
  filesystem content) unless the user explicitly opts a cloud provider in.
- **latency-optimized** — prefer whichever enabled, healthy provider has
  the lowest observed p50 latency for the recent window, local or cloud.
  Used for interactive voice (`docs/22-voice/voice-assistant.md`), where
  responsiveness is the binding constraint.
- **cost-optimized** — prefer the lowest `cost_per_1k_tokens` (or
  equivalent per-domain cost field) among healthy providers meeting the
  task's minimum capability requirements (e.g., context length,
  tool-calling support).
- **manual** — always use the specific `provider_id` the user pinned;
  never override even if degraded (the UI still surfaces a health
  warning).

## Hybrid local/cloud execution

"Hybrid" is not a fifth policy — it is the emergent behavior of any
policy above operating over a Capability Registry that has both local
and cloud providers enabled. A single conversation may use a local STT
model for transcription, a cloud LLM for reasoning, and a local TTS model
for the spoken response, each independently routed. `hardware-detection.md`
determines which local providers are even viable to enable in the first
place; routing then chooses among whatever the user has enabled.

## Fallback chains

Every routing decision walks the enabled-provider list for a capability
in priority order, skipping any that fail `healthCheck()` or whose `describe()` capabilities don't meet the request's minimum requirements.
The chain is exhausted — not retried indefinitely — before returning a
typed "capability unavailable" error to the caller (Planner, Executor, or
UI), which is responsible for surfacing that clearly rather than
retrying silently forever.

## Offline fallback

If every enabled _cloud_ provider for a capability is unreachable
(network partition, or `docs/00-overview/assumptions.md`'s "the network
is unreliable" case generally) but an enabled _local_ provider for that
same capability exists and passes `healthCheck()`, the fallback chain
must fall through to it regardless of the capability's configured
routing policy — a `cost-optimized` or `latency-optimized` policy's
ordering preference is not a reason to return "capability unavailable"
while a working local option sits unused. This operationalizes
`docs/29-product/product-principles.md`'s "local-first, cloud-optional"
principle for the specific case of total cloud unavailability, not just
for `privacy-first`-policy capabilities. Only when no local provider is
enabled for the capability at all does the chain exhaust as described
above.

## Per-request override

A single request (from the Planner, a plugin, or a user command) may
specify a `provider_hint` that constrains the candidate set for that call
only — e.g., "use the local model for this because the content is
sensitive" — without changing the capability's persistent policy. This
is how privacy-sensitive one-off actions stay possible even when the
default policy is cost- or latency-optimized.

## Observability

Every routing decision is logged with: capability, candidate provider
IDs, bounded eliminations and why, and the final choice. This feeds both
`docs/10-security/audit.md` (for privacy-relevant capabilities) and
`docs/23-autonomy/personal-analytics.md` (for the user-facing "what did
NOVA use this month" view). Routing logs never include request contents,
credentials, prompts, audio, transcripts, or provider responses. When a
request requires `streaming`, invocation additionally verifies that the
selected adapter returns a real `AsyncIterable`; a buffered response is
rejected and the finite fallback chain continues.

## Related documents

- `docs/25-failure-modes/FM-04-model-router-provider-fallback.md` — failure modes for this subsystem
- `docs/05-ai/model-router.md` — the original LLM-specific instance;
  kept as the domain-specific detail doc for LLM routing edge cases
- `capability-management.md` — registry this reads from
- `hardware-detection.md` — determines local-provider viability
- `docs/22-voice/voice-assistant.md` — the primary latency-optimized
  consumer of this system
