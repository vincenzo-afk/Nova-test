# Decision & Confidence Contracts

## Purpose

States exactly how the Planner chooses between multiple valid plans, and
exactly what "confidence" means and requires as evidence — per Sections
17 and 18 of the master documentation outline. `docs/05-ai/planner-agent.md`
describes the planning algorithm; `docs/05-ai/confidence-propagation.md`
describes how confidence scores flow through the reasoning pipeline.
This document is the decision rule that sits between them: given several
candidate plans, each with its own confidence, which one wins.

## Scope

The comparison and scoring model used whenever more than one valid plan,
tool choice, or resolution exists. Does not cover the single-path case,
where there is only one valid option and no comparison is needed.

## Decision contract: comparing candidate plans

When the Planner produces more than one viable candidate for the same
goal, it scores each on:

- **Risk** — the highest risk tier any step in the plan touches
  (`docs/10-security/permissions.md`'s Execution risk tiers table,
  carried on each step per `docs/03-runtime/
  planner-executor-contract.md`'s `risk_tier` field);
  lower risk scores higher, all else equal.
- **Cost** — estimated token, time, and resource cost
  (`19-ordering-concurrency-and-retry-rules.md`'s resource limits).
- **Confidence** — the plan's aggregate confidence score (see below).
- **Time** — estimated wall-clock time to completion.
- **Resources** — whether required resources/locks are currently
  available without contention.

The candidate with the highest weighted score is selected; weights are
configured per deployment (`docs/14-development/configuration-schema.md`)
with a documented system default that favors risk and confidence over
raw speed. A tie within the configured tolerance is not resolved by an
arbitrary tiebreaker — it is treated as genuine ambiguity and routed to
`escalation-rules.md`.

## Confidence contract

A confidence score is never presented or acted on without also carrying:

- **Reason** — the specific basis for the score (e.g., "exact match
  found," "inferred from three similar past tasks," "no supporting
  evidence, extrapolated").
- **Evidence** — the concrete inputs (memory entries, prior task
  outcomes, tool results) the score was derived from, per
  `docs/05-ai/confidence-propagation.md`.
- **Verification status** — whether the claim behind the score has been
  independently checked by the Verifier, or is still unverified.
- **Unknowns** — what would change the score if it became known (e.g.,
  "confidence would increase if the target file's last-modified date
  were available").

A bare confidence number with no reason, evidence, or stated unknowns is
treated as an incomplete contract, not a usable signal — per
`docs/05-ai/explainability.md`, a decision made on such a number is
required to be flagged as unverified downstream.

## Threshold for autonomous action

A plan or step is only eligible for autonomous execution (no human
confirmation) when its confidence score, evidence, and verification
status together clear the threshold defined for its risk tier in
`docs/23-autonomy/`. A high confidence score with weak evidence does not
substitute for a low-risk classification, and a low-risk action with no
evidence at all does not qualify for autonomy either — both dimensions
are required independently.

## Maintenance rule

Any new candidate-selection point added to the Planner (a new kind of
plan comparison, not covered by the five factors above) must state its
own scoring model here before shipping — an implicit "pick the first
one" or "pick the one the model liked best" is exactly the improvisation
this document exists to prevent.

## Related documents

- `docs/25-failure-modes/FM-05-llm-core-and-ai-specific-failures.md` — failure modes for this subsystem
