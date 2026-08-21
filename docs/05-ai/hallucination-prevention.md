# Hallucination Prevention

## Purpose

Defines how NOVA gates AI-influenced decisions by risk tier so that a
model's confidence in its own output is never the sole safeguard before a
consequential action executes.

## Scope

Risk-tier-based confirmation gating specifically for AI-influenced
outputs (plans, disambiguation choices, generated content used in an
action). General risk-tiered execution policy for all actions, AI-
influenced or not, is `docs/10-security/permissions.md` (Tier 3); this
document is the AI-specific application of that policy.

## Risk tiers for AI-influenced actions

| Tier | Examples | Gate |
|---|---|---|
| Low | Retrieval-grounded Q&A answers, read-only summaries | Automatic — no confirmation required |
| Medium | Reversible file operations planned by the LLM (e.g., organizing files per inferred rules) | Confirmation optional, configurable by the user |
| High | Actions affecting multiple files/resources, or acting on an LLM-resolved ambiguous entity match | Mandatory approval before execution |
| Critical | Destructive/irreversible actions whose target was determined via LLM reasoning rather than an exact deterministic match | Multi-step confirmation (explicit description of the action plus a separate explicit confirm) |

## Why risk tier depends on how the target was determined, not just the
action type

An identical action (deleting a file) is treated differently depending on
how confidently its target was identified: deleting a file the user named
exactly is a more confident, lower-risk operation than deleting "the file
that's probably the duplicate," where an LLM inferred the target. This
document's tiers specifically account for the provenance of the
decision, not only the mechanical action being taken — a destructive
action reached via the ambiguity-resolution flow's LLM-disambiguation
branch (`ambiguity-resolution.md`) is never treated as equivalent in
confidence to the same action reached via an exact deterministic match.

## Relationship to the general three-tier risk model

This document's four tiers (Low/Medium/High/Critical) are a finer-grained
subdivision used specifically for AI-influenced decisions — they are not
a competing scale against `docs/10-security/permissions.md` (Tier 3)'s
three general tiers (Read-only / Reversible-write / Destructive-
irreversible), which apply to every action regardless of how its target
was determined. The two scales map as follows, and any document
referencing "risk tier" without qualification for an AI-influenced
decision means this table's scale, not the general one:

| AI-specific tier (this document) | General tier (`permissions.md`) it refines |
|---|---|
| Low | Read-only |
| Medium | Reversible-write, confirmation optional |
| High | Reversible-write, confirmation mandatory (escalated beyond the general default because the target was LLM-resolved, not exactly matched) |
| Critical | Destructive/irreversible |

A Medium or High AI-specific tier never reduces the confirmation
requirement below what the general tier alone would already demand — it
can only hold it steady or escalate it, consistent with
`confidence-propagation.md`'s "confidence pushes caution up, never down"
rule. Where this document says "Medium risk tier" or similar elsewhere in
this repository (`explainability.md`, `confidence-propagation.md`), it
refers to this table's AI-specific scale.

## Grounding requirement as a hallucination control

Per `docs/04-memory/search.md`, any answer or plan step synthesized by the
Reasoning Engine must be traceable to specific retrieved memory/graph
records. An output that cannot be grounded this way is treated as
un-actionable — it can be surfaced to the user as a suggestion requiring
explicit confirmation, but it cannot drive an automatic action.

## Confidence is not the same as low risk

A model reporting high confidence in its own output does not change which
tier applies — tier is determined by the action's reversibility and the
provenance of its target, as defined above, never by the model's
self-reported certainty, which is not a reliable safety signal on its own.

## Related documents

- `docs/25-failure-modes/FM-05-llm-core-and-ai-specific-failures.md` — failure modes for this subsystem
- `docs/10-security/permissions.md` (Tier 3) — the general risk-tier
  policy this document specializes for AI-influenced actions
- `ambiguity-resolution.md` — where LLM-resolved targets originate
- `docs/04-memory/search.md` — the grounding requirement referenced above
