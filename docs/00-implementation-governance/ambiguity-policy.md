# Ambiguity Policy

## Purpose

The single most important operational rule in this repository's
governance layer, per `ai-constitution.md` Rule 8. Stated here as its
own file because it is referenced by nearly every other document in
`docs/00-implementation-governance/` and needs one canonical location
rather than being re-explained slightly differently each time.

## Scope

Applies the moment an AI agent (or human) notices that more than one
valid implementation, interpretation, or design choice exists for the
task in front of them — regardless of how small the divergence seems.

## The policy

```
Two or more valid implementations exist
              ↓
         Do NOT choose
              ↓
   Search the documentation thoroughly
   (docs/, this folder, the relevant contract)
              ↓
      Still genuinely ambiguous?
              ↓
        Ask the human
```

## The four absolute triggers

These are not weighed against convenience, deadline pressure, or how
"obviously right" an option looks. Any one of them, on its own, stops
forward progress:

1. **The decision is classified Required or Forbidden.** There is
   nothing to negotiate — see `decision-authority-matrix.md`,
   `forbidden-decisions.md`. A Required/Forbidden classification is not
   a starting point for discussion; it is the answer.
2. **The decision is not explicitly documented.** Do not invent it, even
   provisionally, even labeled as a guess. Undocumented means
   unresolved, not "use your judgment."
3. **Multiple valid implementations exist and no document picks one.**
   This is genuine ambiguity by definition — stop and ask, per the flow
   above. A tie within
   `docs/05-ai/decision-and-confidence-contracts.md`'s scoring tolerance
   counts as this case, not as a coin flip.
4. **A link is broken or a referenced document is missing.** Do not
   proceed as if the missing document said whatever would be convenient.
   A broken cross-reference is itself a
   `docs/37-edge-cases/documentation-integrity-failure.md` condition —
   report it and stop, don't route around it with an assumption about
   what the missing file probably would have said.

None of these four are negotiable by finding a clever reframing that
makes the situation seem to fall outside them — see
`code-generation-rules.md`, Phase 4: "did I assume anything not stated"
is exactly the question designed to catch a rationalized way around this
list.

## What "search the documentation thoroughly" means

Before escalating, check, in order:

1. `decision-authority-matrix.md`, `forbidden-decisions.md`,
   `allowed-decisions.md` — is this decision already classified?
2. The relevant component's contract
   (`docs/26-system-reference/15-build-contracts.md` or its own
   document) and `canonical-patterns.md`.
3. `technology-lock.md` / `architecture-lock.md` — is a choice already
   locked?
4. Prior ADRs (`docs/15-decisions/`) — has this exact question been
   decided before, for a similar case?

If the documentation resolves the ambiguity, that resolution is used
and — where it materially shaped the implementation — cited in the
change description. Skipping this search and escalating immediately is
also a violation of this policy: escalation is for genuine gaps, not a
substitute for reading.

## If still ambiguous

Ask the human. The question is specific: state the decision point, the
candidate options, and why the documentation didn't resolve it. This
mirrors the escalation format required by
`docs/05-ai/escalation-rules.md` for NOVA's own runtime behavior — the
build-time and run-time versions of this principle are intentionally
symmetrical.

## What is never acceptable

- Writing "I assumed X" and proceeding.
- Picking the interpretation that seems "most likely correct" without
  documentation support.
- Silently defaulting to whichever option is easiest to implement.
- Treating a tie within `docs/05-ai/decision-and-confidence-contracts.md`'s
  scoring tolerance as a coin flip rather than as ambiguity.

## Enforcement

A change that resolved a genuine ambiguity by assumption rather than by
following this policy fails `quality-gates.md` regardless of whether the
resulting code is otherwise correct — an accidentally-correct assumption
is still a policy violation, because the next one won't be accidentally
correct.
