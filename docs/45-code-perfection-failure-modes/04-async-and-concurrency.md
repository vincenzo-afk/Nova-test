# Landmines: Async & Concurrency


## Where this breaks

1. **Fire-and-forget async calls with no error handler** — a
   `someAsyncFn()` without `await` or a `.catch()`, especially inside an
   observer loop, silently swallows failures and the calling code
   proceeds as if it succeeded.
2. **Awaiting inside a loop when calls are independent**, serializing
   what must be parallel (and vice versa: `Promise.all`-ing writes that
   must be ordered, causing a race). Every loop with async calls must
   have an explicit comment on why it's sequential or parallel.
3. **Shared mutable cache/map accessed from multiple async contexts
   without a lock**, e.g. two observer callbacks both doing
   read-modify-write on the same in-memory dict — classic
   check-then-act race condition.
4. **Task queue consumer not handling duplicate delivery.** Most queue
   systems are at-least-once; if the consumer isn't idempotent, a
   redelivered task executes twice.
5. **Timeout not actually canceling the underlying operation** — many
   `Promise.race`-style timeout patterns let the original operation keep
   running in the background after the "timeout" branch resolves,
   leaking resources and potentially still mutating state after the
   caller has moved on.
6. **Deadlock from two services awaiting each other's readiness signal**
   at startup, undetectable until start-up order changes — every
   inter-service await at boot must have a timeout and a clear error, per
   `02-startup-sequence.md`.
7. **Event listener registered inside a function that's called
   repeatedly**, leaking listeners and eventually causing duplicate
   handling of the same event (or a memory leak) — verify every
   `on()`/`addEventListener` has a matching lifecycle-bound `off()`.
8. **Backpressure not handled on an observer producing events faster than
   the memory layer can persist them** — without a bounded queue and
   drop/coalesce policy, this leads to unbounded memory growth or an OOM
   crash under load.
