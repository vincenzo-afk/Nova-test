# FM-20: Deployment & Evolution Failures

## Purpose

Failures in shipping new versions of NOVA itself, and the longer-arc failures that appear as the system and its data accumulate history across versions.

## Scope & Related Documents

This file is part of `docs/25-failure-modes/`, the project-wide failure-mode catalog. It must be read alongside:

- `docs/13-devops/deployment.md` - `docs/13-devops/updates.md` - `docs/13-devops/installation.md` - `docs/14-development/release-checklist.md` - `docs/19-setup/setup-wizard.md` - `docs/19-setup/configuration-system.md`

## Failure Catalog

Each failure is assigned a stable ID (`FM-20-0XX`) for cross-referencing from code comments, incident reports, and other failure-mode files.

| ID | Failure | Trigger Condition | Detection | Severity | Mitigation (prevent) | Recovery (respond) |
|---|---|---|---|---|---|---|
| **FM-20-001** | Build failed | Compilation/bundling fails due to a code or dependency error. | CI build step exits non-zero. | Medium | Reliable CI on every commit, not just before release, so build breaks are caught within minutes of introduction. | Fix the specific build error; block deployment until CI is green — never deploy a build that didn't pass CI. |
| **FM-20-002** | Environment variable missing | Required config/secret env var not set in the target environment. | Startup fails a config-validation check referencing the specific missing variable. | High | Validate all required environment variables at startup with a clear error naming exactly what's missing, per `docs/14-development/configuration-schema.md`'s Startup validation section. | Set the missing variable and restart; add it to the deployment checklist/template so it's not missed again. |
| **FM-20-003** | Wrong Node/runtime version | Deployment target runs a different language-runtime version than the build/test environment. | Runtime-version check fails at startup, or subtle behavioral differences appear. | Medium | Pin exact runtime version via a version-manifest file, checked at both build and deploy time. | Correct the runtime version in the target environment and redeploy. |
| **FM-20-004** | Docker build failed | Container image build fails (bad Dockerfile step, missing base image, network issue during build). | Image-build CI step exits non-zero. | Medium | Cache-friendly, well-tested Dockerfile with pinned base-image versions to reduce build-time surprises. | Fix the specific failing build step; verify the fix with a local build before pushing again. |
| **FM-20-005** | Server unavailable (deployment) | Target deployment host/service is unreachable during the deploy step. | Deploy tooling reports connection failure to the target. | Medium | Health-check the deployment target before attempting deploy, with clear pre-flight failure rather than a partial/hanging deploy attempt. | Retry once the target is confirmed reachable; investigate why it was unreachable (separate from the deploy tooling itself). |
| **FM-20-006** | SSL issue (deployment) | New/renewed certificate misconfigured on deploy. | TLS handshake failures against the newly-deployed endpoint. | High | Automated certificate provisioning/renewal with validation as part of the deploy pipeline, not a manual step prone to being forgotten. | Roll back to the previous valid certificate configuration; fix the automation gap. |
| **FM-20-007** | Domain misconfigured | DNS/routing not updated correctly for a new deployment. | New deployment unreachable at its expected domain despite the service itself being healthy. | Medium | Automate DNS/routing changes as part of the deploy pipeline with post-deploy verification, not a manual step. | Fix the DNS/routing configuration; verify with an end-to-end reachability check, not just 'the change was made'. |
| **FM-20-008** | Rollback failed | Attempting to roll back a bad deployment fails or leaves the system in a worse state than the failed forward deploy. | Rollback procedure itself errors, or post-rollback health checks fail. | Critical | Test the rollback path itself as part of every release, not just the forward-deploy path, per `docs/14-development/release-checklist.md`. | Escalate immediately; restore from the last known-good deployment artifact/snapshot rather than continuing to attempt an unreliable rollback procedure live. |
| **FM-20-009** | Old memories incompatible | Schema evolution in the memory store makes old records unreadable by the new code without a migration. | Deserialization failure for records written by an older schema version. | High | Every schema change ships with a corresponding migration and is tested against real old-format data before release, per `docs/14-development/module-checklist.md`'s Schema migration tested item. | Run the migration against affected records; never ship a schema change without a tested backward-migration path. |
| **FM-20-010** | Schema migrations fail | See FM-14-015; included here as a release-process failure specifically. | See FM-14-015. | High | See FM-14-015, plus: dry-run every migration against a production-data snapshot before the actual release. | See FM-14-015's rollback recovery. |
| **FM-20-011** | Plugin API changes (evolution) | Core NOVA API evolves in a way that breaks the installed base of third-party plugins. | Plugin compatibility test suite (run against real installed plugins, not just samples) fails post-change. | Medium | Deprecation window and versioned API surface for any breaking change, per `docs/16-extensibility/plugin-versioning.md`, rather than an unannounced break. | Maintain a compatibility shim for the deprecation window; communicate the breaking change clearly to plugin authors in advance. |
| **FM-20-012** | Capability deprecation | A capability is removed/replaced and dependent plans/automations that reference it start failing. | Plan-validation failures spike for plans referencing the deprecated capability. | Medium | Deprecation warnings surfaced well before removal, with an automated migration path to the replacement capability where possible. | Route deprecated-capability requests to the replacement automatically during the transition window if semantically equivalent. |
| **FM-20-013** | Legacy data unreadable | Data written under a schema version so old that no migration path was ever written for it. | Migration chain has a gap; data from that era fails every available migration. | High | Never let migration debt accumulate — every schema version needs a migration to the next version, forming an unbroken chain, verified in CI. | If a genuine gap exists, write a one-time archaeological migration for that specific old format rather than declaring the data permanently lost. |
| **FM-20-014** | Backward compatibility breaks | A change that was believed to be backward-compatible turns out not to be, discovered only in production. | Post-deploy error rate spikes specifically for users/data on the older format/version. | High | Backward-compatibility test suite covering N-1 (and ideally N-2) versions' data/behavior, run in CI before every release. | Roll back if the break is severe; otherwise ship an emergency compatibility patch and add the missed scenario to the compatibility test suite. |

## Compounding Failures

Notes on how failures in this file interact with failures elsewhere in this catalog — read these before assuming a bug is isolated to one subsystem.

- Legacy data unreadable (FM-20-013) is the long-term consequence of skipping FM-14-015's migration-testing discipline even once — schema evolution debt compounds silently until an old user's data becomes unrecoverable years later, so migration rigor matters most exactly when it feels least urgent.

## Severity Legend

- **Critical** — data loss, security compromise, or user-visible harm; requires an incident-response runbook, not just a bug ticket.
- **High** — silent incorrectness, significant user-visible breakage, or a failure that blocks task completion with no graceful degradation.
- **Medium** — degraded quality/UX or a failure with a working but imperfect fallback.
- **Low** — cosmetic, rare, or fully recoverable with negligible user impact.
