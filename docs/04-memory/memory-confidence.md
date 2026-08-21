# Memory Confidence

## Purpose

Consolidates and extends confidence tracking across all memory, not only
User Preferences (already scored per `docs/04-memory/memory-ranking.md`):
every stored memory record carries confidence, source, verification
status, and last-confirmed timestamp, so nothing is treated as
unconditionally true by default.

## Scope

Confidence, source, and verification metadata at the individual-record
level. Confidence as a *ranking* factor during retrieval is
`docs/04-memory/memory-ranking.md`; this document covers where that
confidence value comes from and how it changes over a record's lifetime.

## Confidence metadata per record

Every memory record (Working, Recent, Long-term, and Knowledge Graph
entities/relationships alike) carries:

```json
{
  "confidence": "0.0-1.0",
  "source": "observed | user_stated | inferred | llm_synthesized",
  "verification_status": "unverified | corroborated | user_confirmed",
  "last_confirmed": "ISO 8601 or null if never confirmed"
}
```

## Source-based initial confidence

- **observed** (from an Observer event, `docs/07-observers/`) — high
  initial confidence for the fact that the event occurred; lower
  confidence for any inferred meaning attached to it.
- **user_stated** — high initial confidence, since it is a direct
  statement, subject to the correction-supersedes rule in
  `docs/04-memory/memory-ranking.md`.
- **inferred** — moderate initial confidence; the specific value depends
  on the strength of the inference (e.g., entity resolution's confidence
  score, `docs/04-memory/entity-resolution.md`).
- **llm_synthesized** — moderate-to-low initial confidence by default; a
  synthesized summary is treated as needing corroboration before being
  weighted as heavily as a directly observed or stated fact, consistent
  with the grounding requirements in `docs/04-memory/search.md`.

## Verification status transitions

A record's `verification_status` advances from `unverified` to `corroborated` when an independent second signal supports it (mirroring
State Manager's conflict-resolution corroboration model,
`docs/03-runtime/state-manager.md`, applied here to memory records
generally rather than only current desktop state), and to
`user_confirmed` when the user directly confirms it — the highest
confidence tier, used, for example, when a Memory Explorer user action
explicitly confirms a fact is correct.

## Confidence decay is source-dependent, not automatic across the board

Per `docs/04-memory/memory-ranking.md`, stated preferences do not decay
automatically. Inferred and LLM-synthesized facts, however, can be
configured to decay in confidence over time if never corroborated or
confirmed, reflecting that an unverified inference grows less trustworthy
the longer it goes unconfirmed, whereas a direct user statement does not.

## Effect on retrieval and action

Low-confidence, unverified records are still retrievable (Search
surfaces them per `docs/04-memory/search.md`) but are weighted down in
ranking (`docs/04-memory/memory-ranking.md`) and, per
`docs/05-ai/hallucination-prevention.md`, a low-confidence fact feeding a
destructive-risk-tier decision is treated more conservatively by the
Permission Manager than a high-confidence one.

## Confidence change model (qualitative, deliberately not a fixed formula)

Confidence moves according to the following qualitative rules, applied
consistently across Memory records and World Model entries alike:

- **Increases** when an independent corroborating signal appears (a
  second observation source agrees, or the user explicitly confirms),
  per the corroboration model already described in
  `docs/03-runtime/state-manager.md` and applied here to memory
  generally.
- **Decreases** when a contradicting signal appears without being an
  explicit correction (routed through
  `docs/04-memory/memory-conflict-resolution.md`'s contested-fact
  handling rather than an automatic decrease alone).
- **Decays** over time only for `inferred` and `llm_synthesized` source
  records left uncorroborated (per this document's source-based initial
  confidence section) — `observed` and `user_stated` records do not decay
  purely from the passage of time.
- **Expires** (drops to effectively zero / excluded from ranking) when
  the underlying record itself expires per
  `docs/04-memory/memory-lifecycle.md`'s policy tiers — confidence and
  existence are not decoupled once a record is gone.
- **Manual override** — a user can directly set a record's confidence
  (e.g., explicitly marking a fact as confirmed via Memory Explorer,
  `docs/09-ui/memory-explorer.md`), which is treated as the highest-
  confidence input available and is not subsequently decayed by the
  passive rules above until an explicit contradicting user action occurs.

**This document deliberately does not specify exact numeric
coefficients** (e.g., a decay half-life in days, or a corroboration
weight multiplier). These are explicitly classified as
**IMPLEMENTATION-DEFINED (intentionally delegated)**: they must be set
and adjusted empirically against real usage and the benchmark suite
(`docs/11-performance/benchmarks.md`), not hard-coded as an architectural
commitment in this specification before any real data exists to tune
them against. An implementation MUST choose concrete values for every
coefficient this document leaves unspecified — leaving a coefficient
undefined at runtime is not a valid reading of this delegation — but
MAY choose any values consistent with the qualitative rules above,
and MUST make the chosen values configurable and revisable rather than
buried as inline literals, so later empirical tuning does not require a
code change. Specifying invented numbers here would create a false
impression of precision without a basis for the specific values chosen.

## Related documents

- `docs/25-failure-modes/FM-01-memory-and-knowledge-graph.md` — failure modes for this subsystem
- `docs/04-memory/memory-ranking.md` — confidence as a retrieval-ranking
  factor
- `docs/03-runtime/state-manager.md` — the analogous corroboration model
  for current-state resolution
- `docs/05-ai/hallucination-prevention.md` — how confidence affects
  action risk-tier treatment
