# Runtime Application Composition

## Purpose

`RuntimeApplication` is the local composition root for the runtime-facing
application. It creates one authoritative local configuration store, task
manager, CommunicationBus event journal, webhook manager, Planner–Executor–
Verifier coordinator, authenticated REST server, and authenticated WebSocket
server.

## Ownership

The application owns the lifecycle of these instances and starts the REST and
WebSocket servers together. If WebSocket startup fails, the REST server is
stopped before the startup error is returned. Shutdown closes the WebSocket
transport before the REST listener.

The task manager remains the only owner of task-state transitions. The
`RuntimeTaskCoordinator` delegates planning, permission-gated execution, and
verification, then publishes correlated `task.progress` envelopes through the
same event source used by the WebSocket transport.

The REST handlers for task creation/status/list, configuration read/update,
and webhook registration are connected to the application’s actual stores and
services. There is no fabricated task ID, configuration response, or webhook
metadata in this composition root. Feature handlers that require additional
services remain outside this constructor until those services can be wired to
their documented persistence and authorization boundaries.

## Configuration and security

The application requires an explicit `NovaConfiguration` at construction. It
creates tokens through `LocalApiTokenIssuer`; callers must grant only the
scopes needed by the operation. Configuration updates pass through the
section-level `ConfigurationStore.update` validator, and webhook registration
passes through the real `WebhookManager.register` implementation.

## Recovery boundary

This composition root is the host boundary for the lifecycle and recovery
sequence in `docs/02-architecture/lifecycle.md`. Incremental persistence,
crash recovery, and unfinished-task resumption remain host responsibilities and
must be added before a packaged desktop service claims full recovery support.

## Related documents

- `docs/02-architecture/lifecycle.md`
- `docs/03-runtime/runtime-task-coordinator.md`
- `docs/03-runtime/task-manager.md`
- `docs/08-api/rest-api.md`
- `docs/08-api/websocket.md`
