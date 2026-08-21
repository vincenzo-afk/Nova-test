# Bootstrap & Health Commands

## `nova init`

Also invocable as `npx nova init` or `pnpm create nova` for zero-install
bootstrap. Performs, in order:

```
1. Clone templates
   ↓
2. Verify toolchain (Node/Rust/etc. — see `nova doctor`'s checklist)
   ↓
3. Install dependencies
   ↓
4. Create default config (docs/26-system-reference/08-configuration-reference.md)
   ↓
5. Download required assets (local model weights, default plugin set)
   ↓
6. Verify configured providers reachable
   ↓
7. Create workspace (docs/28-multi-device-protocol/10-identity-and-workspace.md)
   ↓
8. Run health check (nova doctor)
   ↓
9. Ready
```

This is the same shape as `docs/26-system-reference/02-startup-sequence.md`
but for first-time setup rather than every subsequent process start —
`nova init` runs once per workspace; the startup sequence runs every time
NOVA's runtime starts thereafter.

## `nova doctor`

Runs every check below and reports ✓/✗ with a specific remediation
suggestion per failure (not just pass/fail):

```
✓ Node          ✓ Bun           ✓ Rust          ✓ Git
✓ Docker        ✓ FFmpeg        ✓ GPU           ✓ Ollama
✓ OpenAI Key    ✓ Anthropic Key ✓ Gemini Key    ✓ Disk Space
✓ Permissions   ✓ Ports         ✓ Config        ✓ Plugin Integrity
```

Each check maps to a specific `NOVA-` error code
(`docs/26-system-reference/06-error-catalog.md`) on failure, so a failed
`nova doctor` run is immediately actionable by an AI agent reading its `--json` output, not just a human reading a red X.

## `nova diagnostics`

Produces `diagnostics.zip` containing: current resolved config (secrets
redacted), recent logs, recent traces, `nova doctor`'s full output,
`nova env`'s full output, plugin manifest list, and the last N task
records with PII/secret fields redacted per the same rules
`docs/10-security/audit.md` applies to audit-log export. Intended to be
attachable to a bug report or fed directly to an AI agent for diagnosis
via `nova explain`.

## `nova upgrade`

Updates schemas, configs, plugins, migrations, and docs version in a
single transactional step:

1. Snapshot current state (config, schema versions) before touching anything.
2. Run the migration chain for every out-of-date schema
   (`docs/25-failure-modes/FM-20-deployment-and-evolution.md`'s
   migration-chain discipline — never skip a version in the chain).
3. Update plugin manifests to their compatible versions per
   `docs/26-system-reference/09-version-compatibility-matrix.md`.4. Verify with `nova verify` before declaring success.
5. On any step failure, roll back to the pre-upgrade snapshot rather than
   leaving a partially-upgraded workspace.

## `nova repair`

Detects and auto-fixes: missing folders, corrupted cache, wrong file
permissions, broken plugin registrations, stale/corrupted config, and
damaged search indexes — essentially a CLI-invocable version of the
recovery procedures in `docs/03-runtime/failure-recovery.md`, scoped to
things safely auto-fixable without risking data loss. Anything not
safely auto-fixable (e.g., ambiguous memory conflicts) is reported, not
silently guessed at.

## Related documents

- `docs/26-system-reference/02-startup-sequence.md` — the ordinary
  startup sequence `nova init`'s step 8 hands off to
- `docs/25-failure-modes/FM-20-deployment-and-evolution.md` — the
  migration-chain rules `nova upgrade` follows - `docs/03-runtime/failure-recovery.md` — the recovery taxonomy `nova repair` implements a CLI-invocable subset of

## Where This Breaks

Failure modes specific to this command group. Cross-referenced from `docs/25-failure-modes/FM-25-cli-infrastructure.md`, which indexes all CLI failure entries in one place.

| ID | Failure | Trigger | Detection | Severity | Mitigation | Recovery |
|---|---|---|---|---|---|---|
| **FM-25-004** | `nova init` partially completes and leaves a broken workspace | A step (e.g. asset download) fails after templates were already cloned and dependencies installed. | `nova doctor` run immediately after a failed `init` shows a consistent, diagnosable set of failures rather than an ambiguous mixed state. | High | Treat `init` as transactional like `upgrade`: snapshot-and-rollback on failure rather than leaving a half-built workspace. | Run `nova repair`, or safest, delete and re-run `nova init` from scratch since no user data exists yet at this stage. |
| **FM-25-005** | `nova doctor` reports false green | A check passes (e.g. 'Ollama' ✓) but the underlying capability is actually broken in a way the check doesn't exercise (e.g. Ollama running but with no models pulled). | User/agent proceeds assuming the capability works, then hits `FM-04` model-router failures downstream that `doctor` should have caught. | Medium | Make each check exercise the capability meaningfully (e.g. an actual trivial completion call), not just process-liveness, mirroring `FM-15-009`'s readiness-vs-liveness distinction. | Strengthen the specific shallow check; treat any doctor-missed failure discovered downstream as a doctor-check gap to close. |
| **FM-25-006** | `nova repair` 'fixes' something that wasn't actually broken, masking a real issue | Overly aggressive auto-repair heuristic triggers on a false positive. | Repair log shows an action taken where a manual investigation finds nothing was actually wrong. | Medium | Conservative repair heuristics — only act on unambiguous, well-understood broken states; report and defer to the user for anything ambiguous. | Document the false-positive pattern and tighten the heuristic; `--dry-run` output should have made this visible before `--apply` was used. |
| **FM-25-007** | `nova upgrade` migration chain has a gap for very old workspaces | Same failure as `FM-20-013` (legacy data unreadable), CLI-surfaced. | `upgrade` fails partway with a specific 'no migration path from vX to vY' error rather than a generic failure. | High | Same mitigation as `FM-20-013`: never let migration-chain debt accumulate. | Same recovery as `FM-20-013`: write the missing one-time migration rather than declaring the workspace unrecoverable. |
