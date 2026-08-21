# AI Implementation Philosophy

## Purpose

States the philosophy behind letting an AI agent build NOVA itself, and
the guardrails that make that safe. This document is the "why"; the
mechanical procedure that follows from it lives in
`docs/43-ai-development/` (implementation order, coding guidelines, task
generation, checklists) and is referred to throughout this repository as
the AI Implementation Protocol.

## Scope

Applies to any AI agent — Claude, or any other model — used to write,
review, or modify code, schemas, or documentation in this repository. It
does not apply to NOVA's own runtime AI behavior as a product
(`docs/05-ai/`), which has its own specification.

## Core belief

An AI implementer is only as reliable as the specification it reads. Most
AI-authored code fails not because the model can't write correct code,
but because it is missing context it silently fabricates instead of
asking for. This repository's entire documentation structure — the
32-section outline this file is part of — exists to remove the need for
fabrication: every question an implementer would otherwise have to guess
the answer to (state ownership, error handling, invariants, forbidden
patterns) has a canonical, discoverable answer somewhere in `docs/`.

The corollary: if an AI implementer cannot find the answer to a question
in the docs, the correct action is to say so and stop, not to infer a
plausible answer and proceed. `docs/43-ai-development/common-pitfalls.md` and `hallucination-prevention.md` (`docs/05-ai/`) both treat "invented an
unstated design decision" as the single most damaging failure mode in
this repository, more damaging than a bug, because it produces code that
looks correct, passes a shallow review, and silently diverges from the
system's actual contracts.

## Principles

### 1. Specification is load-bearing, not aspirational

A doc that says "the Executor validates permissions before running a
tool" is not a description of intent — it is the thing the Executor's
tests are graded against. An AI implementer treats every normative
statement in `docs/` as a requirement, not a suggestion, unless the
statement is explicitly marked as an example or non-binding note.

### 2. Read before writing, always

No code is written before the relevant contract, invariants, and
ownership rules are read, per the four-phase protocol in
`docs/43-ai-development/implementation-order.md`
(Understand → Validate → Implement → Self-Review, mirrored from Section
32 of the master outline). Skipping "Understand" to save time is the
single highest-leverage way to introduce a defect that later passes
tests but violates the spec's intent.

### 3. Silence is not permission

Where the documentation is silent on a design question, that silence is
a gap to flag, not a decision to make. An AI implementer that fills a gap
with a plausible-sounding default without flagging it has made an
undocumented architectural decision unilaterally — which is itself a
violation of Engineering Principle 1 (Contracts before code).

### 4. Self-review is mandatory, not optional politeness

The Phase 4 self-review checklist
(`docs/43-ai-development/review-checklist.md`) is run against every
change before it is considered complete, including changes that "seem
obviously correct." Confidence is not evidence; the checklist is.

### 5. Confidence must be calibrated, not performed

An AI implementer states uncertainty when it exists. A confident-sounding
answer built on an assumption is worse than an uncertain answer, because
it removes the human reviewer's opportunity to catch the assumption
before it ships. See `docs/05-ai/confidence-propagation.md` for how this
principle is enforced in NOVA's own runtime reasoning, which this
repository's build process deliberately mirrors.

### 6. Determinism first applies to tooling too

Where a build, validation, or generation step can be done with a
deterministic script (schema validation, dependency graph checks, lint
rules), it is — the same "Deterministic Before Intelligent" principle
from `design-principles.md` applies to how this repository is built, not
just to what NOVA does at runtime. AI judgment is reserved for the steps
that genuinely require it: design tradeoffs, ambiguous requirements,
code review reasoning.

## What this philosophy is not

It is not a claim that AI-generated code is exempt from review, nor that
following the protocol guarantees correctness. It is a claim that most
AI-authored defects in a documentation-first repository are attributable
to unread or unwritten context, and that fixing that specific failure
mode is worth the overhead of a strict protocol. Section 32's four
phases exist because that overhead is worth paying deliberately, once,
rather than paying repeatedly in debugging every unintentional deviation
found downstream.
