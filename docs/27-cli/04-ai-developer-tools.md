# AI Developer Tools

These commands exist specifically to make an AI coding agent (Claude,
GPT, or any other) immediately productive against this repository
without needing to read the entire `docs/` tree for every task.

## `nova context <subsystem>`

`nova context runtime` outputs **only** the documents relevant to the
named subsystem — resolved by walking the `Related documents` sections
transitively from the subsystem's primary doc, bounded by a configurable
depth, and deduplicated. Designed to be piped directly into an AI
agent's context window, respecting `docs/26-system-reference/08-configuration-reference.md`'s `limits.max_context_tokens`.

## `nova task <subsystem>`

`nova task provider-router` generates a complete AI-ready task package:

```
task-provider-router/
├── docs.md            # relevant documentation (same as `nova context`)
├── adrs.md             # relevant ADRs (docs/15-decisions/)
├── apis.md              # relevant API contracts (docs/08-api/)
├── tests.md              # existing + expected test files
└── acceptance-criteria.md
```

An AI agent can start implementing directly from this package without a
separate research/discovery phase — this is the single highest-leverage
command in the CLI for AI-agent-driven development.

## `nova impact <subsystem>`

`nova impact memory` shows blast radius before a change is made: files
affected, tests affected, APIs affected, workflows affected, and plugins
affected — derived from `docs/26-system-reference/01-component-dependency-graph.md` and `05-data-ownership.md` plus a static-analysis
pass over actual code references, not documentation alone (documentation
references understate impact if code has drifted from docs, which is
exactly the class of failure `FM-24` exists to catch).

## `nova docs <topic>`

`nova docs provider` returns every document mentioning "provider" as a
primary topic (ranked by relevance, not just keyword match), the query
counterpart to `nova context`'s subsystem-walk approach — useful when the
right subsystem name isn't already known.

## `nova graph`

Renders `docs/26-system-reference/01-component-dependency-graph.md` /`docs/02-architecture/dependency-map.md` as an interactive visual graph
(SVG/HTML output), with `--format mermaid` to emit source Mermaid
directly for embedding elsewhere.

## Related documents

- `docs/26-system-reference/01-component-dependency-graph.md`,
  `05-data-ownership.md` — the structural data `impact` and `graph` draw from - `docs/15-decisions/` — ADRs `task` packages include - `docs/08-api/` — API contracts `task` packages include

## Where This Breaks

Failure modes specific to this command group. Cross-referenced from `docs/25-failure-modes/FM-25-cli-infrastructure.md`, which indexes all CLI failure entries in one place.

| ID | Failure | Trigger | Detection | Severity | Mitigation | Recovery |
|---|---|---|---|---|---|---|
| **FM-25-011** | `nova context`'s relevance walk includes stale/irrelevant docs | Transitive `Related documents` walk pulls in a document that's only tangentially related, diluting the AI agent's context (same failure class as `FM-06-002`, too much context). | Manual spot-check of `nova context` output for a known subsystem finds low-relevance inclusions. | Medium | Bound walk depth conservatively and rank by directness of reference, same relevance-threshold principle as `FM-06-002`'s mitigation. | Tune the relevance/depth parameters; report which subsystem's context was too noisy so the ranking heuristic can be corrected for that case. |
| **FM-25-012** | `nova impact` misses a real dependency because it only scans documentation, not code | A code-level dependency was never documented in `05-data-ownership.md`/the dependency graph. | Post-change incident traces back to an impact the tool didn't flag. | High | `impact` must combine static code analysis with documentation, per the note above — never trust documentation alone as complete, given `FM-24`'s drift risk. | Add the missed dependency to both the actual dependency graph doc and the tool's static-analysis scope; treat as a `FM-24`-class documentation gap too. |
| **FM-25-013** | `nova task`'s acceptance-criteria generation is generic, not specific to the actual subsystem | Template-based generation doesn't pull real, subsystem-specific acceptance criteria from the relevant product/spec docs. | AI agent implementing from the package produces something that passes generic criteria but misses the actual subsystem's real requirements. | Medium | Derive acceptance criteria from the subsystem's actual `docs/01-product/` and `docs/15-decisions/` content, not a generic template. | Regenerate the task package with corrected sourcing; flag the subsystem for a documentation completeness review if source material was itself too thin. |
