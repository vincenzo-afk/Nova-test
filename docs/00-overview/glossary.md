# Glossary

## Purpose

A flat, alphabetical, dictionary-style reference for quick lookup of terms
and acronyms used anywhere in this repository. Where a term has an
architecturally significant meaning specific to NOVA, this entry is a short
definition with a pointer to `terminology.md` or the owning Tier 2/3
document for full detail — this file intentionally does not repeat that
detail.

## A

**ADR** — Architecture Decision Record. See `docs/15-decisions/`.
**Agent** — See `terminology.md`.
**Ambiguity Resolution** — The decision flow determining when an LLM call
is justified. See `docs/05-ai/ambiguity-resolution.md` (Tier 2).
**Archive** — Cold memory storage tier. See `terminology.md`.

## C

**Communication Bus** — The asynchronous message bus all services
communicate through; no service calls another directly.
**Context Builder** — Assembles the per-request working context from
memory tiers without exceeding the model context window. See
`docs/05-ai/context-builder.md` (Tier 2).

## D

**Deterministic Before Intelligent** — See `terminology.md` and `design-principles.md`.

## E

**Executor** — See `terminology.md`.
**Execution Priority** — See `terminology.md` and `docs/06-tools/execution-priority.md` (Tier 2).

## K

**Knowledge Graph** — See `terminology.md` and `docs/04-memory/knowledge-graph.md` (Tier 2).

## M

**MCP (Model Context Protocol)** — See `terminology.md`.
**Model Router** — See `terminology.md`.

## O

**Observer** — See `terminology.md`.
**Ontology** — The fixed set of node and edge types in the Knowledge
Graph. See `docs/04-memory/ontology.md` (Tier 2).

## P

**Planner** — See `terminology.md`.

## R

**Risk Tier** — See `terminology.md` and `docs/10-security/permissions.md` (Tier 3).
**Runtime** — See `terminology.md`.

## T

**Task Success Score** — See `terminology.md` and `docs/01-product/success-metrics.md`.
**Tool / Tool Registry** — See `terminology.md`.

## V

**Verifier** — See `terminology.md`.

## W

**Working Memory / Recent Memory / Long-term Memory** — See
`terminology.md` and `docs/04-memory/memory-architecture.md` (Tier 2).

## Related documents

- `terminology.md` — narrative explanation of the terms above
