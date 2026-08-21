# ADR-0004: AI Architecture

## Status
Accepted

## Context

The original concept's "learning" and "personalization" language implied
more than retrieval-based context assembly, without being explicit about
whether model fine-tuning was involved. The foundational review also
identified using an LLM to route between LLMs as a risky recursive
judgment layer, and flagged that treating AI reasoning as the default
mechanism (rather than the exception) would make the system slow,
expensive, and hard to debug.

## Decision

Deterministic Before Intelligent is adopted as NOVA's primary AI-layer
principle: an LLM is invoked only when deterministic execution cannot
produce a single, high-confidence result, per the decision flow in
`docs/05-ai/ambiguity-resolution.md`. Model routing is deterministic
(rule-based on task type, latency, cost, privacy, capability, and
availability), never itself an LLM call. Personalization is retrieval-
based only — no model fine-tuning on user data is performed in the
current scope. A single, parameterized Planner-Agent runtime replaces
the originally considered set of separately implemented "agent types."

## Alternatives Considered

- **LLM-based model routing** — rejected due to the added latency, cost,
  and unverifiable recursive-judgment risk identified in the review.
- **Fine-tuning on user data for personalization** — rejected for v1
  given its added privacy surface and cost, with retrieval-based
  personalization judged sufficient for the stated use cases; left open
  as a possible future direction requiring its own ADR if pursued.
- **Ten separately implemented agent types** (planner, research, coding,
  browser, file, memory, verification, cleanup, etc.) — rejected because
  they differ mainly in system prompt and tool allowlist, not underlying
  logic; implementing them separately multiplies engineering and testing
  surface for no behavioral gain a configuration parameter could not
  achieve.

## Consequences

This decision keeps the majority of tasks fast, free, and predictable
(deterministic execution), reserving LLM cost and latency for genuinely
ambiguous or generative tasks. It requires that new tool integrations
implement a deterministic path wherever feasible rather than defaulting
to LLM resolution for convenience, which is enforced via
`docs/14-development/architecture-rules.md`, Rule 1.

## Related Documents

- `docs/05-ai/deterministic-first.md`, `ambiguity-resolution.md`,
  `model-router.md`, `planner-agent.md` — full implementation detail
- `docs/01-product/success-metrics.md` — how adherence to this decision
  is measured over time
