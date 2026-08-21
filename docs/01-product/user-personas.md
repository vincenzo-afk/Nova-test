# User Personas

## Purpose

Describes who NOVA is being built for in the current phase, so that
feature and UX decisions have a concrete audience to be judged against
rather than an implicit "everyone."

## Scope

v1 targets power users exclusively. General consumer personas are
explicitly deferred — see `docs/00-overview/non-goals.md` and `ROADMAP.md`.

## Primary personas

### The Developer
Works across multiple repositories and projects simultaneously, uses a
terminal and an IDE daily, and frequently loses track of "which project was
I in the middle of" across context switches. Values precision and hates
being told something succeeded when it didn't. Wants NOVA to answer
"what was I doing in this repo last week" and to safely run a specific,
known git or build command without babysitting it.

### The AI Engineer
Runs local models, experiments with multiple providers, and cares
specifically about cost and latency per call — this persona is the reason
Model Routing and the cost-aware execution priority chain exist as
first-class concerns rather than an afterthought. Wants full local-only
operation to be a real, complete mode, not a degraded fallback.

### The Researcher
Accumulates large numbers of documents, notes, and half-finished
investigations across long time horizons (months, not days). Values the
Knowledge Graph's ability to surface a forgotten connection between two
pieces of work more than any single automation feature. Tolerant of
friction if it protects against losing or misattributing information.

### The Technical Creator
Builds side projects and prototypes across many small, short-lived
efforts (a pattern reflected directly in the kind of project history NOVA
is designed to organize). Values low-friction capture of ideas and
decisions in the moment, and later retrieval of "what did I decide about
X and why," over heavy upfront configuration.

## Explicitly deferred personas

Non-technical consumers, who would need default-locked-down permissions,
simplified language throughout the UI, and guardrails against
misinterpreting NOVA's capabilities, are out of scope for v1 by design —
see `docs/00-overview/non-goals.md`. Any UX decision that would improve
the experience for this deferred persona at the cost of friction or
complexity for the primary personas above must be rejected for the
current phase.

## How these personas are used

Every entry in `use-cases.md` and `user-journeys.md` is written against
one or more of the primary personas above. A proposed feature that does
not clearly serve one of these four must be treated as a Phase 5
candidate, not folded into the current scope.

## Related documents

- `use-cases.md` — concrete tasks these personas perform
- `user-journeys.md` — how these personas experience NOVA over time
- `docs/00-overview/non-goals.md` — the deferred consumer persona and why
