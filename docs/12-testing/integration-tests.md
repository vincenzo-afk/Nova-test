# Integration Tests

## Purpose

Verifies that services correctly interact over the real Communication
Bus, catching the class of defect unit tests cannot: message envelope
mismatches, incorrect topic subscriptions, and dependency-order
violations.

## Scope

Cross-service interaction testing. Full end-to-end user-facing scenarios
are `e2e-tests.md`.

## What is tested at this layer

- **Message contract compliance** — every service's published and
  consumed messages conform to `docs/02-architecture/communication-model.md`'s envelope schema, including schema-version
  compatibility handling (a service correctly ignoring unknown fields
  from a newer minor version).
- **Dependency-order correctness** — services started in the order
  implied by `docs/02-architecture/dependency-map.md` correctly
  initialize; a deliberately-misordered startup is tested to confirm
  the appropriate dependency-wait behavior in
  `docs/03-runtime/service-lifecycle.md` engages rather than the
  dependent service silently operating against an unready dependency.
- **Event pipeline correctness** — the observation pipeline
  (`docs/02-architecture/execution-pipeline.md`) is tested end-to-end
  from a simulated Observer event through Memory Writer, Knowledge Graph
  Linker, and Index Creation, confirming the full chain produces a
  searchable record.
- **Permission gate enforcement** — a simulated tool call with a
  destructive risk tier is tested to confirm the Permission Manager
  actually blocks it pending confirmation, exercising the real
  inter-service call path rather than a mocked stand-in for it.

## Real bus, test doubles for external systems

Integration tests run against the real Communication Bus and real
inter-service message flow, but still use test doubles for genuinely
external systems (AI providers, MCP servers, the actual OS input-
injection APIs) — this layer verifies NOVA's own services correctly
integrate with each other, not third-party system behavior.

## Event-storm and backpressure testing

Per `docs/02-architecture/event-driven-architecture.md`, integration
tests specifically include a simulated event-storm scenario (a burst of
thousands of filesystem events in a short window) to confirm coalescing,
batching, and backpressure behavior functions as documented, not just in
the steady-state case most other tests exercise.

## Related documents

- `docs/25-failure-modes/FM-08-code-generation-and-testing.md` — failure modes for this subsystem
- `testing-strategy.md` — this layer's place in the overall model
- `docs/02-architecture/communication-model.md`, `docs/02-architecture/dependency-map.md`,
  `event-driven-architecture.md` — the contracts verified at this layer
- `e2e-tests.md` — the next layer up
