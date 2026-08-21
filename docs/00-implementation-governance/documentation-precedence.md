# Documentation Precedence

## Purpose

Clarifies how the two precedence systems in this repository relate:
this governance folder (process — how an agent behaves) and
`docs/00-overview/normative-precedence.md` (specification — which
document wins when two describe NOVA's behavior differently). They
answer different questions and are both authoritative within their own
question.

## Scope

Meta-level: which precedence order applies to which kind of question.

## The two systems

### Process precedence — this folder

Governs *how an AI agent behaves*: what it may decide unilaterally, what
it must escalate, what technology and architecture choices are locked,
what counts as done. Topped by `ai-constitution.md`. Applies regardless
of which component or subsystem the task touches.

### Specification precedence — `docs/00-overview/normative-precedence.md`

Governs *which specification document is correct* when two documents
describing NOVA's actual behavior conflict — e.g., a component document
says one thing about a payload shape and the wire schema says another.
Topped by `docs/00-overview/system-invariants.md`.

## How they interact

`ai-constitution.md` sits above both, because it is the rule that says
*what to do* when either system reveals a conflict or a gap: stop,
search, and if still unresolved, ask (`ambiguity-policy.md`). The
Constitution does not override `system-invariants.md`'s content — an
invariant is still an invariant — it governs the *process* for handling
the moment a conflict involving an invariant is discovered.

Concretely: `project-constraints.md`
(`docs/00-implementation-governance/`) restates the process-level "must
never" list; `docs/00-overview/system-invariants.md` and `docs/00-overview/constraints.md` remain the specification-level source
for what those constraints actually are. Where this folder summarizes
specification content (as `technology-lock.md` summarizes `docs/14-development/technology-stack.md`, or `architecture-lock.md` summarizes `docs/14-development/architecture-rules.md`), the detailed
source document remains authoritative for the full content — the
governance-folder file is the fast-reference entry point, not a second
independent source that could drift and win a conflict on its own.

## Practical rule

1. A question about *what NOVA does* → `docs/00-overview/normative-precedence.md`'s
   order.
2. A question about *what an AI agent building NOVA is allowed to do*
   → this folder, topped by `ai-constitution.md`.
3. A genuine conflict between the two systems themselves (not expected,
   but possible if one drifts) → treat as an `ambiguity-policy.md`
   trigger and escalate; do not silently resolve it by picking one
   system over the other.
