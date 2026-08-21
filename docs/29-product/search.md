# Search

Unified search spans chat history, memory, tasks, and files indexed by observers, ranked by `docs/04-memory/memory-ranking.md`. Search must degrade gracefully to keyword-only matching if the embedding/ranking service is unavailable — never a blank/error result for a basic case. Mechanism: `docs/04-memory/retrieval-engine.md`'s Degraded operation section (`FM-01-021`) — the fusion pipeline's branch independence, not a separate fallback path.
