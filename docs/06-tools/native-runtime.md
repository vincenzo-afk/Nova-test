# Native Runtime (Execution Tier 1)

## Purpose

Describes the highest-priority execution tier: built-in, compiled
functions that require no external process, API call, or UI interaction —
the fastest, cheapest, and most reliable tier, used whenever a task falls
within its coverage.

## Scope

What belongs in this tier and its interface characteristics. General
tier-ordering rules are `execution-priority.md`.

## What belongs in this tier

Direct filesystem operations (read, write, move, rename using the OS
filesystem API directly rather than a CLI wrapper), in-process parsers
(JSON, YAML, common config formats), in-process calculators and regex
evaluation, and direct queries against the Memory and Knowledge Graph
storage engines (`docs/04-memory/memory-storage.md`).

## Characteristics

- **Latency** — lowest of any tier; no process spawn, no network call.
- **Reliability** — highest of any tier; failure modes are limited to the
  underlying OS call itself failing, which is directly observable.
- **Verification signal** — typically the strongest available: direct
  return codes, file hashes computable immediately after the operation.
- **Risk profile** — varies by action (a read is read-only; a delete is
  destructive), but the mechanism itself carries no additional risk
  beyond the action's inherent risk tier, unlike GUI-based tiers which
  add mechanism-level risk (misclicks, wrong-window targeting).

## Why this tier is preferred first

Every characteristic above is strictly better than any lower tier for
tasks it can cover — there is no scenario where a lower tier is preferable
for a task Native Runtime can already perform correctly. This is why it
sits first in `execution-priority.md`'s chain, and why new capability
must always be implemented at this tier if feasible before falling back
to a lower one.

## Interface

Native Runtime tools implement `tool-interface.md`'s contract directly in
compiled code within the Executor process (`docs/03-runtime/executor.md`)
— there is no external process boundary to cross, which is what
distinguishes this tier from Internal Functions (still first-party, but
may still involve slightly heavier logic such as index queries against
the Knowledge Graph) and definitively from API/MCP/CLI tiers (which all
cross a process or network boundary).

## Related documents

- `docs/25-failure-modes/FM-07-tool-execution-and-mcp.md` — failure modes for this subsystem
- `execution-priority.md` — this tier's place in the overall chain
- `tool-interface.md` — the interface this tier implements directly
- `docs/04-memory/memory-storage.md` — the storage layer this tier
  queries directly for memory-related native operations
