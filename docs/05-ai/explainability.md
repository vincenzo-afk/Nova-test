# Explainability

## Purpose

Defines the standard schema the Planner uses to explain why it chose a
given plan, capability, or model — going beyond the raw audit trail
(`docs/10-security/audit.md`, which records *what* happened) to produce a
structured, human-readable explanation of *why*, on request or
automatically for higher-risk decisions.

## Scope

The explanation schema and when it is generated. The underlying data it
draws from (memory records, confidence values, routing decisions) is
documented in the components that produce that data.

## Explanation schema

```json
{
  "task_id": "string",
  "explanation": {
    "why_this_plan": "string, plain-language summary of the goal decomposition",
    "why_this_capability": [
      { "step_id": "string", "capability_id": "string", "reason": "string" }
    ],
    "why_this_model": {
      "provider": "string",
      "model": "string",
      "reason": "string, per docs/05-ai/model-router.md routing factors"
    },
    "why_not_alternatives": [
      { "capability_id": "string", "reason_rejected": "string, e.g. 'lower confidence match', 'exceeded configured cost ceiling', 'privacy policy requires local-only for this project'" }
    ],
    "confidence": "combined value per docs/05-ai/confidence-propagation.md",
    "grounding_references": ["array of memory/graph record IDs the plan relied on"]
  }
}
```

## When an explanation is generated

Every task produces enough structured data (per the audit trail,
`docs/10-security/audit.md`) to construct this explanation on request —
generating it eagerly for every task would be wasted work for routine,
low-risk actions the user never asks about. It is generated:

- **On explicit user request** — a "why did you do that" query in any UI
  surface (`docs/09-ui/memory-explorer.md`'s audit-trail link, or
  directly in Chat, `docs/09-ui/chat.md`).
- **Automatically, for Medium AI-specific risk tier and above**
  (`docs/05-ai/hallucination-prevention.md`'s Low/Medium/High/Critical
  scale, not the general Read-only/Reversible-write/Destructive scale in
  `docs/10-security/permissions.md`) — surfaced as part of the
  confirmation prompt itself, so the user sees the "why" before
  approving, not only after the fact.

## Grounding requirement applies to explanations too

Per `docs/04-memory/search.md`'s grounding requirement, `why_this_plan` and `why_this_capability` are generated from the actual retrieved
records and routing decisions that occurred — the explanation is a
faithful account of the real decision process, not a plausible-sounding
post-hoc narrative constructed separately from what actually happened.
This is enforced by generating the explanation from the same structured
audit data every action is already required to produce, not from a
separate LLM call reasoning about "why might I have done this."

## Explanation and capability/model reasoning

`why_this_capability` explains capability selection in terms of the
Capability Registry's matching (`docs/05-ai/capability-registry.md`) —
e.g., "this step needed filesystem search, which capability X provides."
`why_this_model` explains model selection in terms of the Model Router's
actual deterministic routing factors (`docs/05-ai/model-router.md`) —
e.g., "routed to a local model because the privacy configuration for
this project requires it," never a vague "the AI decided."

`why_not_alternatives` answers the complementary "why not the other
option" question — every capability or provider that was a candidate but
was not selected (per Capability Registry matching or Model Router
scoring) is listed with its specific rejection reason, rather than the
schema only ever justifying the winning choice. This is populated from
the same routing/matching pass that produced `why_this_capability` and `why_this_model`, not a separate retrospective explanation.

## Related documents

- `docs/25-failure-modes/FM-05-llm-core-and-ai-specific-failures.md` — failure modes for this subsystem
- `docs/10-security/audit.md` — the underlying structured data this
  explanation schema is generated from
- `docs/05-ai/confidence-propagation.md` — the confidence value included
  in the schema
- `docs/10-security/permissions.md` — where automatic explanation
  generation is triggered for higher-risk confirmations
