# ADR Template

## Purpose

The standard structure every Architecture Decision Record in this folder
follows, and the template for any new ADR proposing a change to an
already-accepted decision.

## Structure

Every ADR in this folder uses the following sections:

```markdown
# ADR-NNNN: <Decision Title>

## Status
Proposed | Accepted | Superseded by ADR-XXXX

## Context
What problem or question forced this decision? What constraints applied?

## Decision
The actual decision, stated plainly and specifically.

## Alternatives Considered
What else was considered, and why it was not chosen.

## Consequences
What this decision makes easier, what it makes harder, and what it
forecloses.

## Related Documents
Links to the architecture documents this ADR's decision is implemented
in.
```

## Rules for using this template

- An ADR is a historical record. Once **Accepted**, its Context,
  Decision, Alternatives Considered, and Consequences sections are not
  edited — a change in direction is recorded as a new ADR with status
  **Superseded by ADR-XXXX**, and the old ADR's status line is updated to
  point to it, but its body remains as originally written.
- `docs/02-architecture/architecture-decisions.md` is the living index
  summarizing current decisions; this folder is the permanent record of
  how each decision was reached, including decisions that have since been
  superseded.
- A **Proposed** ADR is a discussion draft, not yet binding — code must
  not be written against a Proposed ADR's decision until it reaches
  **Accepted** status.

## Numbering

ADRs are numbered sequentially and never renumbered, even if superseded —
`adr-0001` remains `adr-0001` permanently, regardless of its current
status.

## Related documents

- `docs/02-architecture/architecture-decisions.md` — the living index
  this template's records feed
- `adr-0001-project-scope.md` through `adr-0006-security.md` — the
  currently accepted ADRs following this template
