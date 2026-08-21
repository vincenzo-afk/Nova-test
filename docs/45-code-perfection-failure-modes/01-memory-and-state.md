# Landmines: Memory & State


## Where this breaks

1. **Reading stale state after a write in the same request.** If the
   write path is async or goes through a cache tier, a read immediately
   after a write can return the pre-write value. Every write path must
   document (and every caller must respect) whether reads are
   read-your-writes consistent or eventually consistent.
2. **Confusing "no memory found" with "memory query failed."** A
   retrieval function that returns `[]` for both cases hides real
   failures (index unavailable, corrupted shard) as if the user simply
   has no relevant memories — this produces confidently wrong AI
   responses. Always return a typed distinction.
3. **Losing memory lineage on transform/merge.** When two memories are
   merged (entity resolution) or a memory is derived from another
   (summarization), failing to record the lineage edge
   (`memory-lineage.md`) makes later "why did NOVA believe this"
   debugging and conflict resolution impossible.
4. **Unbounded growth of working-tier memory** because a cleanup/garbage
   collection pass (`memory-garbage-collection.md`) was implemented as a
   TODO and never scheduled. Memory-tier code without a documented
   eviction policy wired into the scheduler is incomplete, not "fine for
   now."
5. **Versioning skipped on partial updates.** Updating one field of a
   memory object without bumping its version breaks anything doing
   optimistic-concurrency checks or `memory-versioning.md`-based conflict
   resolution downstream.
6. **Confidence scores treated as booleans.** Code that does
   `if (memory.confidence)` instead of comparing against a documented
   threshold silently treats a 0.01-confidence memory as equally valid as
   a 0.99 one, because JS/Python truthiness makes any nonzero number
   "truthy."
7. **Entity resolution merging on weak signals** (same first name, same
   rough timestamp) without the multi-signal check `entity-resolution.md`
   specifies — this silently merges two different people's data, which
   is a correctness and privacy failure simultaneously.
8. **Race between an observer write and a garbage-collection sweep**
   deleting the memory the observer just wrote, because both operate on
   the same tier without a shared lock or write-ahead marker.
9. **Time-based queries using wall-clock `now()` at query time instead of
   the documented reference time**, producing different results if the
   query is retried a second later — breaks idempotent replay
   (`episodic-replay.md`).
10. **Knowledge Graph edges created without checking for existing
    duplicate edges**, producing graph bloat that silently degrades
    ranking quality over time rather than failing loudly.
