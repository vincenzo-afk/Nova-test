# Landmines: Workflow Engine


## Where this breaks

1. **Cycles in the workflow graph not detected before execution.** A
   malformed or dynamically-generated workflow graph with a cycle will
   hang or infinitely loop unless the engine validates for acyclicity at
   creation/compile time, not just relies on a runtime step limit as its
   only defense.
2. **Parallel branches sharing state without merge semantics defined.**
   If two parallel nodes both write to the same downstream variable, the
   engine must have a documented merge/conflict rule (e.g. last-write,
   explicit merge function) — "whichever finishes first wins" silently
   picked by execution order is a nondeterminism bug.
3. **Human-approval gate implemented as a blocking wait with no
   timeout/expiry**, leaving a workflow stuck forever if the human never
   responds, with no automatic escalation or cancellation path.
4. **Rollback only implemented for the "happy path" steps, not for steps
   that partially succeeded.** A step that created two of three required
   resources before failing needs a rollback that knows to clean up the
   two, not just skip rollback because "the step technically failed."
5. **Workflow versioning not handled** — editing a workflow definition
   while instances of the previous version are still running can cause a
   running instance to jump to a node that didn't exist in the version it
   started with, unless in-flight instances pin to their starting
   version.
6. **Step retries not distinguishing engine-level failure (crash, OOM)
   from step-level business failure (tool returned an error)** — these
   need different retry/backoff policies; conflating them causes either
   excessive retries of a permanent failure or no retry of a transient
   engine crash.
