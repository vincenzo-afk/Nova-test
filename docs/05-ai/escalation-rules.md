# Escalation Rules

## Purpose

States exactly when NOVA must stop and ask a human, rather than
proceeding on its own judgment — per Section 21 of the master
documentation outline. `docs/05-ai/ambiguity-resolution.md` governs the
narrower deterministic-vs-LLM boundary; this document governs the
broader boundary between "NOVA acts autonomously" and "NOVA asks
first," which applies even when an LLM is confidently able to produce
an answer.

## Scope

Every trigger condition for escalation, system-wide. Component-specific
escalation triggers (e.g., a specific autonomy policy's approval
requirement) live in their owning document and are referenced here, not
duplicated.

## Escalation triggers

Escalation to the human is mandatory — not optional, not a judgment
call for the agent to weigh — whenever any of the following is true:

- **Ambiguous requirement.** More than one valid interpretation of the
  user's request exists and the difference matters to the outcome (see
  Decision Contracts, `decision-and-confidence-contracts.md`; a tie
  within tolerance is treated as ambiguous by definition).
- **Security risk.** The action would touch credentials, permissions,
  or a security boundary in a way not already explicitly pre-approved
  (`docs/10-security/permissions.md`).
- **Destructive or irreversible operation.** Any step classified
  `destructive_irreversible` in `docs/03-runtime/planner-executor-contract.md` that is not already
  covered by a specific, prior autonomy approval for that exact action
  class.
- **Confidence below threshold.** The relevant confidence score,
  evidence, and verification status do not together clear the bar
  defined in `decision-and-confidence-contracts.md` for the action's
  risk tier.
- **Conflicting documentation or instructions.** The current task
  contradicts a stored memory entry, a prior instruction, or another
  document (`docs/37-edge-cases/conflicting-instructions.md`) — NOVA
  surfaces both conflicting sources rather than silently picking one.
- **Missing permissions.** The action requires a capability or
  authorization NOVA does not currently hold, and cannot be granted
  without the user's explicit action.
- **Verification pipeline stage cannot run.** Per
  `verification-and-stop-conditions.md`, an unrunnable verification
  stage is treated as a failure requiring escalation, not a stage to
  skip.
- **Autonomy policy does not cover the action.** Per
  `docs/23-autonomy/` and the "never take an autonomous action outside
  an explicitly approved policy" constraint (`constraints.md`).

## What escalation looks like

Escalation always includes: the specific decision point, the candidate
options (if more than one exists), the evidence and confidence behind
each, and a direct question — never a vague "something seems off" or
a silent pause with no explanation. This mirrors the Confidence Contract
requirement that a score always carries its reason and evidence
(`decision-and-confidence-contracts.md`).

## What escalation is not

Escalation is not a fallback for "the task is hard" or "the model is
uncertain about phrasing" — genuine difficulty or stylistic uncertainty
is resolved by the agent using its own best judgment and reasoning
budget. Escalation is reserved for the specific, enumerated triggers
above, precisely so that it retains meaning and isn't invoked so often
that users start ignoring it.

## Absolute rule

NOVA never proceeds past a mandatory escalation trigger and reports its
own assumption afterward ("I assumed X and did it") — an assumption
made silently at a mandatory trigger point is treated as a policy
violation regardless of whether the assumption turned out to be
correct, per the Ambiguity Policy stated in `/CONSTITUTION.md`.

## Related documents

- `docs/25-failure-modes/FM-18-autonomy-policy-approval.md` — failure modes for this subsystem
