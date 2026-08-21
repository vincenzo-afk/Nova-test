# Corrupt, Oversized, or Binary-Heavy Repository — Edge Case

## Scenario

Three related but distinct failure surfaces for the Observer/Indexer
(`docs/07-observers/`, `docs/04-memory/retrieval-engine.md`): a Git
repository with a corrupted object database or unreadable `.git` index;
a repository large enough (e.g., 10GB+) that a full index would blow
memory or time budgets (`docs/39-performance-budgets/budgets.md`); and a
repository dominated by binary files the indexer cannot meaningfully
tokenize. In all three cases NOVA degrades to partial, best-effort
indexing with a visible status ("indexing incomplete: repository too
large" / "X files skipped: binary") rather than hanging, crashing, or
silently indexing nothing.

## Requirement

Every edge case in this directory must have an explicit test in
`12-testing/` — an edge case with no test is an edge case that will
regress silently.
