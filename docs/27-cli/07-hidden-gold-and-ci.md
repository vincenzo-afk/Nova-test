# Hidden-Gold Commands & CI/CD Pipeline

## Hidden-gold commands

These are the commands most projects skip, and the ones that make a
difference once NOVA is being actively developed against by multiple
contributors (human or AI) in parallel.

| Command | Purpose |
|---|---|
| `nova sandbox` | Creates an isolated environment to test plugins/workflows safely, without touching real user data — the environment `nova replay` and `nova plugin test` both execute inside |
| `nova benchmark` | Benchmarks providers, prompts, tools, memory retrieval, and workflows against tracked baselines, failing if a regression exceeds the budget in `docs/11-performance/performance-goals.md` |
| `nova explain` | See `05-observability-commands.md` |
| `nova migrate` | Handles config, memory, plugin, and schema migrations between versions — the engine `nova upgrade` calls internally, also invocable standalone for targeted migrations |
| `nova report` | Generates a comprehensive system report: environment, versions, enabled features (cross-referencing `docs/26-system-reference/10-feature-maturity-table.md`), and full diagnostics |
| `nova verify` | Verifies repository integrity: checksums, plugin signatures, config schema conformance, **and documentation consistency** — this is the CLI entry point for the doc-lint checks in `docs/26-system-reference/11-documentation-lint-ci.md`, runnable locally before pushing, not just in CI |
| `nova clean` | Safely removes caches, temporary artifacts, old indexes, and orphaned files without touching user data — dry-run by default |

`nova verify` is the single most important command in this group: it is
the local, on-demand invocation of every automated check described
throughout `docs/25-failure-modes/FM-24-documentation-and-reference-integrity.md` and `docs/26-system-reference/11-documentation-lint-ci.md`,
so drift can be caught before a PR is even opened, not just in CI.

## CI/CD checks

The full pipeline runs roughly thirty checks. Beyond the documentation
checks already specified in `docs/26-system-reference/11-documentation-lint-ci.md`, the additional CI surface includes:

| Category | Checks |
|---|---|
| Code quality | Markdown lint, JSON Schema validation, YAML validation, license headers, dead-file detection, circular-dependency detection |
| Contracts | API contract tests, ADR cross-reference validation, glossary coverage, Mermaid syntax validation, spelling |
| Correctness | Examples-compile check (every code snippet in docs actually compiles/runs), CLI `--help` snapshot tests |
| Performance | Performance-budget regression check (`nova benchmark` run in CI against tracked baselines) |
| Security | Security scan (SAST, per `FM-08-009`), secrets scan (per `FM-12-001`), dependency audit, SBOM generation |
| Release | Binary signing, installer test on Windows/Linux/macOS/Android (actual install-and-`doctor`-passes verification, not just build-succeeds) |

## Related documents

- `docs/26-system-reference/11-documentation-lint-ci.md` — the
  documentation-specific subset of this pipeline, in full detail
- `docs/14-development/release-checklist.md` — where this whole pipeline
  sits in the release gate
- `docs/25-failure-modes/FM-08-code-generation-and-testing.md` — the
  failure catalog the code-quality/correctness checks defend against

## Where This Breaks

Failure modes specific to this command group. Cross-referenced from `docs/25-failure-modes/FM-25-cli-infrastructure.md`, which indexes all CLI failure entries in one place.

| ID | Failure | Trigger | Detection | Severity | Mitigation | Recovery |
|---|---|---|---|---|---|---|
| **FM-25-020** | `nova sandbox`'s isolation has a gap, letting a test plugin/workflow touch real data | Sandbox filesystem/network isolation is incomplete for a specific resource type not yet covered. | Post-incident audit finds real data touched during what should have been an isolated `sandbox`/`replay`/`plugin test` run. | Critical | Defense-in-depth sandboxing, same principle as `FM-12-005` (sandbox escape) — treat any sandbox-isolation gap with the same severity as a security sandbox escape, since the blast radius (real user data) is the same. | Treat as a `FM-12-005`-class incident: contain, audit what was touched, harden the specific isolation gap. |
| **FM-25-021** | `nova benchmark`'s tracked baseline goes stale and stops catching real regressions | Baseline was captured once and never refreshed as legitimate performance characteristics shifted (e.g. after intentionally adding a feature with a known cost). | Benchmark passes despite a real regression, because the baseline itself silently absorbed the regression on a prior run without review. | Medium | Require explicit sign-off (not auto-update) whenever a baseline shifts, so a baseline update is a reviewed decision, not silent drift. | Investigate the specific baseline update history; re-baseline deliberately with a documented justification if the shift was legitimate. |
| **FM-25-022** | `nova verify`'s local run and the CI run disagree | Local environment has a stale cache or different tool versions than CI, producing a false pass locally that CI then fails. | Contributor reports 'verify passed locally but CI failed.' | Low | Pin `nova verify`'s tool versions to match CI exactly (ideally by running the identical containerized check both places, per the Docker Dev infrastructure in `03-dev-infrastructure-and-env.md`). | Investigate and align the specific version/cache divergence; treat CI as authoritative when the two disagree. |
| **FM-25-023** | Installer test passes on CI's clean environment but fails on real user machines with pre-existing state | CI's installer test always runs against a pristine VM, never exercising upgrade-over-existing-install or conflicting-software scenarios real users hit. | User-reported install failures despite green CI. | Medium | Add installer test scenarios for upgrade-over-existing-install and common conflicting-software configurations, not just pristine-environment install. | Add the missing scenario to CI; patch the installer for the specific real-world conflict discovered. |
