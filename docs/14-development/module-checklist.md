# Module Checklist

## Purpose

The concrete, per-pull-request checklist referenced by `CONTRIBUTING.md` and `docs/12-testing/validation.md`, used to verify a change satisfies
every applicable requirement before merge.

## Scope

PR-level review checklist. The underlying requirements each item verifies
are detailed in their own documents, referenced below.

## Checklist

- [ ] **Documentation reference** — the PR description references the
  specific `docs/` path(s) it implements or modifies
  (`CONTRIBUTING.md`).
- [ ] **Documentation accuracy** — if behavior differs from what is
  currently documented, the documentation is updated in the same PR, or
  an ADR is included proposing the change (`docs/15-decisions/`).
- [ ] **Deterministic-first compliance** — if the change introduces any
  LLM-invoking code path, the deterministic-first check
  (`docs/05-ai/deterministic-first.md`) demonstrably runs first
  (`docs/14-development/architecture-rules.md`, Rule 1).
- [ ] **Permission Manager gating** — if the change introduces any new
  execution path, it passes through the Permission Manager
  (`docs/14-development/architecture-rules.md`, Rule 2).
- [ ] **Execution tier correctness** — a new tool integration declares
  the correct execution tier and does not preempt a higher tier
  (`docs/14-development/architecture-rules.md`, Rule 3).
- [ ] **Verification signal declared** — a new tool integration declares
  a real verification signal, or is correctly restricted to
  confirmation-required execution if it cannot
  (`docs/06-tools/tool-interface.md`).
- [ ] **Ontology compliance** — no new Knowledge Graph node/edge type is
  introduced outside the reviewed extension process
  (`docs/04-memory/ontology.md`).
- [ ] **Unit test coverage** for documented decision logic and error
  paths (`docs/12-testing/unit-tests.md`).
- [ ] **Integration test coverage** for new or changed message contracts
  (`docs/12-testing/integration-tests.md`).
- [ ] **Performance impact assessed** — for changes to a service on the
  latency-critical path, benchmark results are included or an
  explanation of why they are unaffected
  (`docs/11-performance/benchmarks.md`).
- [ ] **Audit trail compliance** — any new autonomous action path
  propagates `correlation_id` correctly
  (`docs/10-security/audit.md`).
- [ ] **Schema migration tested** — if this change alters a memory
  record schema or the Knowledge Graph ontology
  (`docs/04-memory/memory-versioning.md`, `docs/04-memory/ontology.md`),
  a corresponding migration is included and tested against real
  old-format data, not just synthetic new-format data, per
  `docs/25-failure-modes/FM-20-deployment-and-evolution.md`'s
  FM-20-009 — a schema change with no tested backward-migration path
  does not pass this checklist.

## Reviewer responsibility

A reviewer approving a PR is attesting that they have verified each
applicable checklist item directly, not merely that the author claims
compliance in the PR description — for the architecturally sensitive
items (deterministic-first compliance, Permission Manager gating), this
means the reviewer traces the actual code path, consistent with
`docs/14-development/architecture-rules.md`'s enforcement expectations.

## Related documents

- `CONTRIBUTING.md` — where this checklist is referenced
- `docs/14-development/architecture-rules.md` — the rules several
  checklist items verify
- `docs/12-testing/validation.md` — the broader acceptance criteria this
  checklist operationalizes at the PR level
