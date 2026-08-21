# FM-16: Resource Management & Performance

## Purpose

Failures related to CPU, memory, GPU, disk, threads, and the slow-degradation failures that come from resource pressure.

## Scope & Related Documents

This file is part of `docs/25-failure-modes/`, the project-wide failure-mode catalog. It must be read alongside:

- `docs/11-performance/resource-usage.md` - `docs/11-performance/concurrency.md` - `docs/11-performance/scalability.md` - `docs/11-performance/optimization.md` - `docs/11-performance/performance-goals.md` - `docs/03-runtime/resource-manager.md` - `docs/11-performance/benchmarks.md`

## Failure Catalog

Each failure is assigned a stable ID (`FM-16-0XX`) for cross-referencing from code comments, incident reports, and other failure-mode files.

| ID | Failure | Trigger Condition | Detection | Severity | Mitigation (prevent) | Recovery (respond) |
|---|---|---|---|---|---|---|
| **FM-16-001** | RAM exhaustion | Unbounded growth in memory usage from a leak, an oversized context, or a runaway cache. | Memory usage metric crosses a critical threshold, or OOM-killer terminates a process. | Critical | Per-component memory budgets with monitoring and soft-limit warnings before the hard OS limit is reached. | Kill and restart the offending component from its last checkpoint; investigate the specific growth source rather than just restarting repeatedly. |
| **FM-16-002** | GPU memory exhaustion | Local model inference or vision processing exceeds available VRAM. | CUDA/GPU out-of-memory error from the inference call. | High | Dynamic batch-size/context-size adjustment based on available VRAM, detected via `docs/18-providers/hardware-detection.md`, rather than a fixed assumption. | Retry with a reduced batch/context size, or fall back to a cloud provider/CPU inference for that specific request. |
| **FM-16-003** | CPU overload | Sustained high CPU usage degrades responsiveness across the system. | CPU utilization metric sustained near 100% across cores for longer than a transient burst window. | Medium | Priority-based CPU scheduling for latency-sensitive tasks (UI responsiveness) over background batch work. | Throttle/defer lower-priority background tasks until load subsides. |
| **FM-16-004** | Disk saturation | I/O-bound workload saturates disk throughput, degrading all disk-dependent operations. | Disk I/O wait metric elevated; operation latencies for disk-bound tasks spike. | Medium | Batch/coalesce write-heavy operations; rate-limit background disk-intensive jobs (indexing, backup) during active-use periods. | Defer non-urgent disk-intensive work until saturation subsides; investigate the specific saturating workload. |
| **FM-16-005** | Too many threads | Thread-per-task pattern without a pool/ceiling creates excessive context-switching overhead. | Thread count metric grows unboundedly with task volume rather than being pool-bounded. | Medium | Bounded thread/worker pools with queueing beyond the pool size, rather than unbounded thread creation. | Cap the pool size and let excess work queue rather than spawning further threads. |
| **FM-16-006** | File descriptor exhaustion | Leaked file/socket handles accumulate until the OS limit is hit. | 'Too many open files' error; open-FD count metric grows over time without corresponding closes. | High | Same structured resource-management discipline as FM-15-016 applied specifically to file descriptors, with periodic leak audits. | Restart the leaking component to force FD reclamation; fix the specific unclosed-handle code path. |
| **FM-16-007** | Cache overflow | Cache grows beyond its intended memory budget due to a missing/broken eviction policy. | Cache memory footprint exceeds its configured budget. | Medium | Enforce a hard eviction policy (LRU or similar) with a real memory-size budget, not just an entry-count budget that can still overflow for large entries. | Force an eviction pass; audit why the configured policy didn't trigger in time. |
| **FM-16-008** | Slow startup | Cold-start time exceeds acceptable bounds due to sequential (rather than parallel) initialization of independent components. | Startup-time metric exceeds the target defined in `docs/11-performance/performance-goals.md`. | Low | Parallelize initialization of components with no interdependency, per the dependency graph from FM-15-001. | No runtime recovery needed; treat as a performance-optimization backlog item. |
| **FM-16-009** | Slow memory search | Retrieval latency degrades as the memory corpus grows, especially with an unoptimized or unindexed similarity search. | Search-latency metric trends upward with corpus size beyond the expected sublinear/logarithmic curve. | Medium | Use an appropriately-scaled ANN index (not brute-force) once corpus size crosses a threshold, per `docs/04-memory/retrieval-engine.md`'s Semantic search index structure section. | Rebuild with a more scalable index structure; consider sharding for very large corpora. |
| **FM-16-010** | Slow graph traversal | Knowledge-graph queries degrade on deep/wide traversals without proper indexing. | Traversal latency spikes for queries beyond a certain hop-depth or fan-out. | Medium | Depth/fan-out limits on traversal queries by default, with indexed shortcuts for common traversal patterns. | Cap traversal depth for interactive queries; run deep traversals as background/batch jobs instead. |
| **FM-16-011** | Slow planning | Planner takes too long to produce a plan for complex tasks, degrading perceived responsiveness. | Plan-generation latency exceeds the target for the task's complexity tier. | Low | Stream partial plan progress to the user rather than blocking entirely on full-plan completion; cache/reuse sub-plan patterns where applicable. | No hard recovery; monitor as a UX/performance metric and optimize the planning prompt/pipeline. |
| **FM-16-012** | Slow routing | Model-router decision itself becomes a latency bottleneck (e.g. an overly complex classification step before every request). | Router decision latency is a significant fraction of total request latency. | Low | Keep the routing decision itself cheap (a lightweight classifier, not a full model call) relative to the actual work it's routing. | Simplify/cache routing decisions for repeat request patterns. |
| **FM-16-013** | Slow tool execution | A specific tool integration is a consistent latency outlier. | Per-tool latency percentiles show one tool far exceeding its peers for comparable work. | Low | Track per-tool latency and set SLA expectations; investigate outliers rather than accepting them as inherent. | Optimize or replace the specific slow tool integration; in the interim, surface expected-wait messaging to the user for that tool. |
| **FM-16-014** | High latency accumulation | Many individually-small latencies (each within its own budget) compound across a long pipeline into an unacceptable total. | End-to-end latency exceeds target even though no single stage individually violated its own budget. | Medium | Track and budget end-to-end latency explicitly, not just per-stage, and design for parallelism across independent stages where possible. | Identify the pipeline's critical path and target optimization there rather than uniformly across all stages. |

## Compounding Failures

Notes on how failures in this file interact with failures elsewhere in this catalog — read these before assuming a bug is isolated to one subsystem.

- Resource exhaustion is rarely the root cause — it's almost always the visible symptom of an upstream failure (a planner loop from FM-02, an event storm from FM-15, or a memory leak from FM-08). Treat every resource-exhaustion alert as a signal to investigate the producing subsystem, not just add more headroom.

## Severity Legend

- **Critical** — data loss, security compromise, or user-visible harm; requires an incident-response runbook, not just a bug ticket.
- **High** — silent incorrectness, significant user-visible breakage, or a failure that blocks task completion with no graceful degradation.
- **Medium** — degraded quality/UX or a failure with a working but imperfect fallback.
- **Low** — cosmetic, rare, or fully recoverable with negligible user impact.
