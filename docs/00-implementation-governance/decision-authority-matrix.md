# Decision Authority Matrix

## Purpose

The single, authoritative answer to "is an AI implementer allowed to
decide this, or must it ask." This file states the classification
framework and the matrix; the two extended lists it summarizes —
everything explicitly forbidden and everything explicitly allowed — are
split into their own files (`forbidden-decisions.md`,
`allowed-decisions.md`) so each can be scanned quickly on its own.

## Scope

Applies to any AI agent contributing code, schemas, or documentation to
this repository. Does not apply to NOVA's own runtime autonomy policy
(`docs/23-autonomy/`), which is a related but separate authority model
for NOVA acting in a user's environment rather than for an AI building
NOVA itself.

## Classification framework

Every implementation decision falls into exactly one of four classes:

- **Required** — a specific choice is mandated; no alternative is
  considered, regardless of how the AI agent weighs tradeoffs. See
  `technology-lock.md` and `architecture-lock.md`.
- **Preferred** — a default choice exists and should be used unless a
  documented, ADR-recorded reason justifies deviating for a specific
  case.
- **Optional** — the AI agent may choose freely among reasonable
  options; the choice has no cross-cutting consequence. See
  `allowed-decisions.md`.
- **Forbidden** — a choice is explicitly excluded, even if it would
  technically work. See `forbidden-decisions.md`.

### Worked example: Database

- **Required:** SQLite (local-first default) / PostgreSQL (shared
  deployment) — see `technology-lock.md`.
- **Forbidden:** MongoDB, or any other database product not named in
  `technology-lock.md`.

## The Matrix

| Decision | Authority |
|---|---|
| Programming language | Human |
| Framework | Human |
| Database | Human |
| Folder structure | Human |
| API contracts | Human |
| Security model | Human |
| Plugin system | Human |
| Event/schema shape | Human |
| Architecture style | Human |
| State management approach | Human |
| UI implementation details (within `docs/09-ui/` and `docs/30-design/` spec) | AI |
| Private helper function names | AI |
| Internal algorithm optimization (behavior-preserving) | AI |
| Code formatting | AI |
| Test implementation (within `docs/12-testing/` strategy) | AI |
| Refactoring (behavior-preserving only) | AI |
| Anything undocumented | No one — escalate to the human, per `ambiguity-policy.md` |

## Default when a decision doesn't appear above

If a decision is not explicitly documented as Required, Preferred, or
clearly Optional (`allowed-decisions.md`), the AI agent treats it as
Forbidden-by-default and stops — per `ambiguity-policy.md`, silence is
never read as permission.

## Relationship to the Constitution

`ai-constitution.md` states this policy as one of its foundational
rules in condensed form; this document is the detailed, worked-out
version an implementer consults when a specific case arises. The
now-superseded combined treatment of this material previously lived at
`docs/43-ai-development/ai-decision-authority.md`; that file now points
here and to its sibling files as the canonical source.
