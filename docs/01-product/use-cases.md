# Use Cases

## Purpose

Concrete, specific tasks NOVA must be able to perform, organized by phase
and mapped to the personas in `user-personas.md`. These exist so that
"the system works" has a testable referent instead of being judged purely
on architecture.

## Scope

Use cases are grouped by the phase in which they become available (see
`ROADMAP.md`). A use case listed under a later phase must not be assumed
working in an earlier one.

## Phase 1 use cases (Observation + Memory, read-only)

1. **"What was I working on in this repo last Tuesday?"** — Developer.
   Answered from Recent Memory and the Knowledge Graph's link between the
   project entity and its file/event history. No execution involved.
2. **"What's the SocialGuard-RL project about?"** — Researcher / Developer.
   Answered from Long-term Memory summaries and linked notes/decisions in
   the Knowledge Graph.
3. **"Find my resume."** — any persona. Deterministic filename/content
   search first (see `docs/05-ai/deterministic-first.md`); an LLM is
   invoked only to disambiguate between multiple equally plausible
   candidates, per `docs/05-ai/ambiguity-resolution.md`.
4. **"What did I decide about the database choice for project X?"** —
   Developer / Researcher. Answered from a Decision entity in the
   Knowledge Graph linked to project X.

## Phase 2 use cases (Narrow whitelisted execution)

5. **"Open config.json in this project."** — Developer. Deterministic file
   lookup plus a native "open file" tool call; read-only risk tier, no
   confirmation required.
6. **"Run git status in this repo."** — Developer. Deterministic CLI tool
   call; read-only risk tier.
7. **"Summarize this document."** — Researcher. Deterministic retrieval of
   the document's content, then an LLM call for summarization (this
   specific task requires natural language understanding and is one of
   the canonical "always use LLM" examples in
   `docs/00-overview/design-principles.md`).
8. **"Create a new folder for this idea under project X."** — Technical
   Creator. Reversible-write risk tier; executed without mandatory
   confirmation but fully logged and undoable.

## Phase 3 use cases (Multi-step planning)

9. **"Clean up my Downloads folder using these rules."** — any persona.
   Multi-step plan with per-step verification; each file move/delete is
   individually risk-tiered, and destructive deletions require
   confirmation even inside an otherwise-approved multi-step task.
10. **"Continue where I left off on project X."** — Researcher / Developer.
    Planner retrieves the most recent session context for project X from
    Recent Memory and the Knowledge Graph, then proposes next steps.

## Phase 4 use cases (Scoped GUI/vision control)

11. **"Open this file in an application that has no CLI or API."** — any
    persona. Falls through the execution priority chain to accessibility-
    tree control, or vision as a last resort, only for applications on the
    explicit supported list in `docs/06-tools/vision.md` (Tier 3).

## Explicitly out of scope for any current phase

- "Do this across all my devices" — deferred to Phase 5, see
  `docs/00-overview/non-goals.md`.
- "Message someone on my behalf on social media" — general third-party app
  automation beyond the explicit allow-list is out of scope entirely (see
  `non-goals.md`), independent of phase.

## Related documents

- `user-personas.md` — the personas referenced above
- `user-journeys.md` — how these use cases compose into an end-to-end
  experience over time
- `success-metrics.md` — how success on each use case is measured
