# FM-01: Memory, Knowledge Graph, Embeddings & Retrieval

## Purpose

Catalogs everything that can go wrong in how NOVA stores, links, embeds, indexes, and retrieves memories. This is the subsystem most implicated in wrong or hallucinated answers, since almost every downstream failure (bad plan, bad answer, privacy leak) traces back to a bad retrieval upstream.

## Scope & Related Documents

This file is part of `docs/25-failure-modes/`, the project-wide failure-mode catalog. It must be read alongside every document in
`docs/04-memory/`, in particular:

- `docs/04-memory/memory-architecture.md`
- `docs/04-memory/retrieval-engine.md`
- `docs/04-memory/knowledge-graph.md`
- `docs/04-memory/embeddings.md`
- `docs/04-memory/memory-ranking.md`
- `docs/04-memory/memory-conflict-resolution.md`
- `docs/04-memory/memory-garbage-collection.md`
- `docs/04-memory/entity-resolution.md`
- `docs/04-memory/memory-lifecycle.md`
- `docs/04-memory/memory-types.md`
- `docs/04-memory/memory-confidence.md`
- `docs/04-memory/memory-storage.md`
- `docs/04-memory/memory-lineage.md`
- `docs/04-memory/memory-versioning.md`
- `docs/04-memory/indexing.md`
- `docs/04-memory/search.md`
- `docs/04-memory/timeline.md`
- `docs/04-memory/ontology.md`

## Failure Catalog

Each failure is assigned a stable ID (`FM-01-0XX`) for cross-referencing from code comments, incident reports, and other failure-mode files.

| ID | Failure | Trigger Condition | Detection | Severity | Mitigation (prevent) | Recovery (respond) |
|---|---|---|---|---|---|---|
| **FM-01-001** | Wrong memory retrieved | Ambiguous query embeds close to an unrelated memory; ranking model overweights recency or lexical overlap. | Retrieval confidence score below threshold but still returned as top-1; user correction rate spikes for a session. | High | Return top-k with confidence bands instead of a single answer; require the Planner to treat low-confidence retrieval as 'unverified'. | Log the query+result pair to a retrieval-error queue; re-rank with a cross-encoder on next request; do not silently reuse the wrong memory in later turns. |
| **FM-01-002** | Forgot important memory (false negative) | Memory was garbage-collected, demoted, or never indexed due to an ingestion failure. | Ask-again pattern detected: user reasks a question already answered in a prior session. | High | Never hard-delete memories flagged 'important' by `docs/04-memory/memory-ranking.md`; soft-archive with recoverable TTL instead. | Run entity-resolution backfill against the timeline store; restore from archive tier if soft-deleted. |
| **FM-01-003** | Retrieved unrelated memory | Embedding collision in high-dimensional space for semantically distant but lexically similar content. | Cross-encoder re-rank score disagrees sharply with the bi-encoder retrieval score. | Medium | Two-stage retrieval (recall via embeddings, precision via re-ranker) before memory ever reaches the Context Builder. | Discard the memory for this turn; do not cache the bad pairing. |
| **FM-01-004** | Duplicate memories | Same event ingested twice from two observers (e.g. clipboard + browser) without dedup key. | Near-duplicate detector (cosine > 0.98) fires on write, or graph shows two nodes with identical entity signature. | Medium | Content-hash + entity-fingerprint dedup at write time in `docs/04-memory/memory-storage.md`. | Merge duplicate nodes via `entity-resolution.md`'s merge procedure; keep the higher-confidence version, discard the other with an audit trail. |
| **FM-01-005** | Memory corruption | Partial write during crash, disk error, or concurrent write race. | Checksum mismatch on read; deserialization failure. | Critical | Write-ahead log + checksum on every memory record per `docs/04-memory/memory-storage.md`'s Durability and integrity section. | Restore the specific record from the last valid WAL checkpoint; if unrecoverable, quarantine and flag for user review rather than silently dropping. |
| **FM-01-006** | Wrong confidence score | Confidence heuristic miscalibrated after a schema or model change; score does not correlate with actual correctness. | Periodic calibration audit compares stated confidence vs. observed correction rate. | Medium | Recalibrate confidence scoring whenever the embedding model or ranking model changes version. | Downgrade all confidence scores from the affected window to 'unverified' until recalibration completes. |
| **FM-01-007** | Outdated memory | A fact changed in the world but the memory graph still holds the stale value (e.g. old job title). | Conflicting new observation ingested; `memory-conflict-resolution.md` detects contradiction. | Medium | Time-decay weighting on facts prone to change (job, address, relationship status) so old values lose ranking priority automatically. | Apply conflict resolution: prefer most-recent, high-confidence source; mark the old value 'superseded', not deleted, to preserve lineage. |
| **FM-01-008** | Infinite memory growth | No garbage collection policy, or GC policy fails silently, causing unbounded storage and slower retrieval over time. | Storage growth rate alert; retrieval latency trend rising with corpus size. | High | Enforce `memory-garbage-collection.md` policy with age/importance/access-frequency scoring, scheduled and monitored. | Run an out-of-band compaction pass; archive cold memories to cold storage tier rather than deleting. |
| **FM-01-009** | Privacy leak | Cross-user memory bleed, or a sensitive memory surfaces in a context where it should be filtered (e.g. shown to a second identity on a shared device). | Identity-scope check fails on retrieval; audit log shows memory owner_id != requester identity_id. | Critical | Hard scope every memory record by `workspace_id` and enforce at the storage layer, not just the application layer, per `docs/04-memory/memory-storage.md`'s Workspace scoping and isolation section. | Immediately purge the leaked memory from any downstream cache/context; log to `docs/10-security/audit.md`; notify per incident-response runbook. |
| **FM-01-010** | Conflicting memories | Two memories assert incompatible facts with similar confidence and no resolution. | Graph shows two edges of the same relation type with different target values, both active. | Medium | Force explicit conflict resolution at write time rather than allowing two 'active' contradictory facts to coexist. | Surface both to `memory-conflict-resolution.md`'s resolution strategy (most-recent, highest-confidence-source, or ask-user). |
| **FM-01-011** | Wrong ranking (retrieval) | Ranking model overfits to recency or popularity signals, burying the actually relevant memory. | A/B comparison between ranking-model output and ground-truth relevance judgments diverges. | Medium | Blend recency, semantic similarity, and explicit importance score rather than any single signal dominating. | Re-rank with a fallback lexical-match pass when semantic ranking confidence is low. |
| **FM-01-012** | Missing documents / chunks (RAG) | Document was ingested but chunking skipped a section (e.g. table, footnote) or ingestion job died mid-file. | Ingestion job status shows partial completion; page/chunk count mismatch vs. source document. | Medium | Verify chunk-count against expected page/section count post-ingestion; fail the ingestion job loudly rather than partially succeeding silently. | Re-run ingestion for the specific missing range only, not the whole document. |
| **FM-01-013** | Duplicate chunks (RAG) | Same document re-ingested without version check, or overlapping chunk windows double counted. | Duplicate content hash across chunk IDs. | Low | Content-hash chunks before insert; skip if hash already present for that document version. | Deduplicate at query time as a safety net even if ingestion dedup failed. |
| **FM-01-014** | Irrelevant retrieval / context fragmentation | Chunk size too small, splitting a coherent idea across chunks that individually look irrelevant. | Retrieved chunks score low individually but the union would have scored high. | Medium | Use overlapping chunk windows and section-aware chunking (respect headings/paragraphs) per `docs/13-devops`/ingestion pipeline. | Re-chunk the offending document with adjusted window size; re-embed. |
| **FM-01-015** | Hallucination due to poor retrieval | Retrieval returns nothing relevant but the LLM answers anyway from parametric knowledge, presenting it as retrieved fact. | Answer contains claims not traceable to any retrieved chunk (checked via citation-grounding verifier). | High | Require the model to explicitly say 'no relevant memory found' when retrieval confidence is below threshold, per `docs/05-ai/hallucination-prevention.md`. | Flag the response as ungrounded before it reaches the user; regenerate with an explicit 'insufficient context' instruction. |
| **FM-01-016** | Broken graph edges | Entity deleted but its relationship edges not cascade-updated. | Graph integrity check finds edges pointing to non-existent node IDs. | Medium | Cascade delete/cascade archive relationship edges whenever a node is removed or merged. | Run graph-integrity repair job; orphaned edges are pruned, not silently left dangling. |
| **FM-01-017** | Wrong entity merge | Entity resolution over-aggressively merges two distinct people/things with similar names. | User reports 'that's not me/not the same thing'; downstream memory contamination between two identities. | High | Require multiple corroborating signals (not just name similarity) before auto-merging entities; low-confidence merges go to a review queue. | Split the merged entity back into two; re-attribute memories using original source provenance, which must be preserved even after merge. |
| **FM-01-018** | Embedding drift after model upgrade | New embedding model produces vectors in a different semantic space; old vectors are no longer comparable. | Sudden drop in retrieval quality immediately following a model version bump. | High | Version-tag every embedding with the model+version that produced it; never mix vector spaces in one similarity search. | Full re-embedding backfill of the corpus before cutting traffic over to the new model; run old and new indices in parallel until backfill completes. |
| **FM-01-019** | Mixed embedding dimensions | Two providers/models with different output dimensionality write into the same vector index. | Insert-time dimension mismatch error, or worse, silent zero-padding. | Critical | Reject writes with mismatched dimensions at the storage layer; one index per model+version. | Rebuild the affected index from source records with a single consistent embedding model. |
| **FM-01-020** | Vector index corruption | ANN index file damaged by crash during build/update. | Search returns errors or wildly wrong nearest neighbors post-crash. | Critical | Atomic index-swap on rebuild (build new, verify, then swap) rather than in-place mutation. | Rebuild the index from the durable source-of-truth vector store; never treat the ANN index itself as the source of truth. |
| **FM-01-021** | Embedding service unavailable at query time | The provider/model that generates query embeddings is unreachable (per `docs/18-providers/`'s health signal) at the moment a search is issued. | Embedding call fails or times out before the Retrieval Fusion Engine's semantic-search branch (`docs/04-memory/retrieval-engine.md`) can run. | High | Semantic search is one of five independent branches in the fusion pipeline, not a single point of failure for the whole query — keyword, graph, temporal, and entity search do not depend on the embedding service and continue to run. | Skip the semantic-search branch for this query only; fuse and rank results from the remaining four methods (this is the technical mechanism behind the keyword-only-degradation commitment in `docs/29-product/search.md`); never return a blank/error result for a query the other four methods can still answer. |

## Compounding Failures

Notes on how failures in this file interact with failures elsewhere in this catalog — read these before assuming a bug is isolated to one subsystem.

- A wrong or missing memory silently propagates into `docs/05-ai/context-builder.md`, producing a plausible-sounding but wrong prompt with no visible error at any layer.
- Knowledge-graph corruption (broken edges, bad entity merges) degrades retrieval ranking even when the underlying vector store is healthy, so memory and graph failures must be diagnosed together, not independently.
- Embedding-model upgrades that are not re-indexed atomically create a window where old and new vectors coexist at different dimensions/semantics, silently degrading similarity search rather than failing loudly.

## Severity Legend

- **Critical** — data loss, security compromise, or user-visible harm; requires an incident-response runbook, not just a bug ticket.
- **High** — silent incorrectness, significant user-visible breakage, or a failure that blocks task completion with no graceful degradation.
- **Medium** — degraded quality/UX or a failure with a working but imperfect fallback.
- **Low** — cosmetic, rare, or fully recoverable with negligible user impact.
