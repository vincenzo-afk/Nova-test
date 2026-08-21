# Architecture Decisions (Index)

## Purpose

A readable index of the structural architecture decisions already locked
in for NOVA, each pointing to its formal Architecture Decision Record in
`docs/15-decisions/` (Tier 3) for full context, alternatives considered,
and consequences. This document is a summary for readers who need "what
was decided" without the full ADR narrative.

## Scope

Structural/architectural decisions only. Product-scope decisions are
indexed in `docs/01-product/project-scope.md`; this index covers how the
system is built, not what it does.

## Decision index

| # | Decision | Summary | Full ADR |
|---|---|---|---|
| 0001 | Project scope | Windows-only, single-machine, single-user v1; open source (MIT); risk-tiered execution included from v1 | `docs/15-decisions/adr-0001-project-scope.md` |
| 0002 | Memory architecture | Four-tier memory (Working/Recent/Long-term/Archive) plus a fixed-schema Knowledge Graph; hybrid storage per tier; no unbounded raw retention | `docs/15-decisions/adr-0002-memory.md` |
| 0003 | Runtime architecture | Modular, independently-supervised service processes over one Communication Bus; no monolithic process, no fully separate installed services | `docs/15-decisions/adr-0003-runtime.md` |
| 0004 | AI architecture | Deterministic Before Intelligent as the primary filter; deterministic (non-LLM) Model Router; no fine-tuning, retrieval-based personalization only | `docs/15-decisions/adr-0004-ai.md` |
| 0005 | Tool system | Fixed execution-priority chain (Native Runtime → ... → Vision → Keyboard/Mouse); GUI/vision control restricted to an explicit app allow-list and always last resort | `docs/15-decisions/adr-0005-tool-system.md` |
| 0006 | Security model | Risk-tiered execution with mandatory confirmation gates for destructive actions; OS credential vault for secrets; strict observed-content/instruction separation | `docs/15-decisions/adr-0006-security.md` |
| 0007 | Extensibility and capability system | Plugin/extension system with independent lifecycle and install-time permission review, treated as untrusted by default; a Capability Registry above the Tool Registry so the Planner never hardcodes tool selection | `docs/15-decisions/adr-0007-extensibility.md` |

## How this index is maintained

A new structural decision is added here only after its ADR is accepted
(see `docs/15-decisions/adr-template.md`, Tier 3, for the acceptance
process). This index must never contain a decision that contradicts an
active ADR, and never describes a decision still under discussion — those
belong in an ADR marked "Proposed," not in this index.

## Why an index separate from the ADRs themselves

The ADRs in `docs/15-decisions/` are written to capture context,
alternatives considered, and trade-offs at the time of the decision — they
are historical records and are not edited once accepted. This index is the
living, current summary, meant to be read first and to point a reader
toward the specific ADR only when they need the reasoning behind a
decision, not just the decision itself.

## Related documents

- `docs/15-decisions/` (Tier 3) — the full ADRs referenced above
- `docs/01-product/project-scope.md` — the product-level scope decision
  (ADR 0001's product-facing counterpart)
