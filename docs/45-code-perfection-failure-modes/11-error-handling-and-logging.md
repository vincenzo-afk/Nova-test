# Landmines: Error Handling & Logging


## Where this breaks

1. **Catching an error and logging it without re-throwing or returning a
   failure signal**, so the caller proceeds as if the operation
   succeeded — the single most common way real failures become invisible
   until a user reports something "just silently not happening."
2. **Generic catch blocks that swallow the distinction between expected
   and unexpected errors** — e.g. catching "file not found" (expected,
   handle it) and "out of memory" (unexpected, must propagate/crash
   loudly) with the same handler.
3. **Logging full request/response payloads that include user data or
   secrets** — every new log statement needs a check against
   `docs/10-security/secrets.md` and `docs/29-product/privacy.md` before it ships.
4. **Error messages shown to the user leaking internal implementation
   details** (stack traces, internal IDs, SQL) instead of the
   user-facing error mapped from `docs/26-system-reference/06-error-catalog.md`.
5. **No correlation ID threaded through a multi-step operation**, making
   it impossible to trace a single user action across Planner → Executor
   → Tool → memory write in logs when debugging a production issue.
6. **Retrying without exponential backoff or jitter**, causing thundering
   herd behavior when a downstream provider recovers from an outage and
   every queued retry fires at the exact same moment.
