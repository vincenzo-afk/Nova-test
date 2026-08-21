# Unit Tests

## Purpose

Specifies unit-testing requirements for individual service logic in
isolation, the foundational layer of `testing-strategy.md`'s four-layer
model.

## Scope

Per-service, in-isolation testing. Cross-service behavior is
`integration-tests.md`.

## Coverage requirements per service category

- **Runtime services** (`docs/03-runtime/`) — state machine transitions
  (Task Manager's states, per `docs/03-runtime/task-manager.md`) are
  tested exhaustively for every valid and invalid transition; the
  Scheduler's priority ordering and concurrency-limit logic is tested
  against constructed queue scenarios without requiring a real running
  system.
- **Memory components** (`docs/04-memory/`) — the memory-lifecycle
  promotion/demotion rules (`docs/04-memory/memory-lifecycle.md`) are
  tested against constructed record sequences; ontology validation
  (`docs/04-memory/ontology.md`) is tested against both valid and
  deliberately invalid node/edge type submissions to confirm rejection
  behavior.
- **AI-layer logic** (`docs/05-ai/`) — the deterministic-first decision
  logic and ambiguity-resolution flow
  (`docs/05-ai/deterministic-first.md`, `docs/05-ai/ambiguity-resolution.md`) are unit tested against the exact worked
  examples documented there, since these are fully deterministic
  decision trees despite governing when non-deterministic LLM calls
  occur.
- **Tool system** (`docs/06-tools/`) — the `tool-interface.md` schema
  validation is tested against both compliant and non-compliant tool
  registration attempts, confirming the "no unattended execution without
  a verification signal" rule is actually enforced, not merely
  documented.

## Mocking external dependencies

Unit tests for any component that would otherwise call an external AI
provider, MCP server, or perform real OS-level input injection use
mocked equivalents — a unit test never makes a real LLM call, real
network request, or real keyboard/mouse action; that level of realism
belongs to `integration-tests.md` and `e2e-tests.md` respectively.

## Coverage as an acceptance gate

Per `validation.md` and `docs/14-development/module-checklist.md`
(Tier 3), a component is not eligible for merge without unit tests
covering its documented decision logic and error-handling paths as
specified in its own architecture document.

## Related documents

- `docs/25-failure-modes/FM-08-code-generation-and-testing.md` — failure modes for this subsystem
- `testing-strategy.md` — this layer's place in the overall model
- `integration-tests.md` — the next layer up
- `docs/14-development/module-checklist.md` — the PR-level enforcement of
  this requirement
