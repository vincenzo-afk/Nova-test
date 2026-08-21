# Analytics Performance Impact

Event emission must be non-blocking (queued, batched) and must never delay a user-facing response — see `docs/45-code-perfection-failure-modes/04-async-and-concurrency.md` item 1 for the failure mode this guards against.
