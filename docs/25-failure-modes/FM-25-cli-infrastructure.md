# FM-25: CLI Infrastructure

## Purpose

Consolidates failure modes specific to `docs/27-cli/` — the developer
CLI (`nova init`, `nova doctor`, and everything under it). The CLI is a
distinct failure surface from the conversational agent runtime cataloged
in `FM-01` through `FM-23`: it is scriptable, invoked by both humans and
CI systems, and its outputs are frequently consumed programmatically
(including by AI agents via `nova context`/`nova task`), so a CLI-layer
failure often propagates silently into automated tooling rather than
being immediately visible to a human.

Individual entries live inline in each `docs/27-cli/*.md` file's own
"Where This Breaks" section (`FM-25-001` through `FM-25-023`); this file
is the index.

## Consolidated failure index

| ID Range | File | Theme |
|---|---|---|
| `FM-25-001` – `003` | `01-cli-overview.md` | Command-tree drift, inconsistent `--json` schemas, missing dry-run on destructive commands |
| `FM-25-004` – `007` | `02-bootstrap-and-health.md` | Partial-`init` breakage, false-green `doctor` checks, over-aggressive `repair`, migration-chain gaps |
| `FM-25-008` – `010` | `03-dev-infrastructure-and-env.md` | `env`/Capability-Registry disagreement, installer signature-check bypass, config validation divergence |
| `FM-25-011` – `013` | `04-ai-developer-tools.md` | Noisy `context` output, code-blind `impact` analysis, generic `task` acceptance criteria |
| `FM-25-014` – `016` | `05-observability-commands.md` | Wrong `explain` root-cause, non-representative `replay` sandbox, `events` overwhelm during storms |
| `FM-25-017` – `019` | `06-plugin-and-ai-sdk.md` | Static-validation false negatives, unverified idempotency-flag claims, credential-scope mismatch in `provider test` |
| `FM-25-020` – `023` | `07-hidden-gold-and-ci.md` | Sandbox isolation gaps, stale benchmark baselines, local/CI verify divergence, pristine-environment-only installer tests |

## The cross-cutting risk

Nearly every entry in this file traces back to one pattern: **a CLI
command's simplified/fast-path check diverging from the full/slow-path
check used elsewhere in the system** (validate-vs-runtime-enforce,
local-verify-vs-CI-verify, sandbox-vs-production). The general mitigation
is the same throughout: the fast path is a first line of defense, never
a replacement for the authoritative slow-path check — the CLI should
make development faster without ever becoming a second, looser source of
truth.

## Related documents

- `docs/27-cli/` — every file in this folder
- `docs/26-system-reference/11-documentation-lint-ci.md` — the check
  suite `nova verify` invokes locally - `docs/25-failure-modes/INDEX.md` — update to include this file
