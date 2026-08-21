# Edge Case Specifications — Index

## Purpose

A single entry point to every edge case NOVA is specified to handle
deliberately rather than accidentally, per Section 16 of the master
documentation outline. Each file in this directory follows the same
terse format (Scenario, Requirement) so an implementer or reviewer can
scan the full list quickly; this index groups them by category and
flags which ones are new since the initial edge-case pass.

## Scope

Indexes `docs/37-edge-cases/` only. Broader failure-mode handling
(detection, severity, mitigation) is `docs/25-failure-modes/` and `docs/36-failure-catalog/`; this directory is specifically the list of
concrete scenarios an implementer might otherwise forget to handle.

## Filesystem and repository

- `empty-project.md` — no files, no VCS history, no memory
- `corrupt-oversized-repository.md` — corrupted `.git`, 10GB+ repos, binary-heavy trees
- `symlink-loops.md` — cyclic symlinks during traversal
- `permission-denied-filesystem.md` — OS-level unreadable/unwritable paths
- `git-detached-head.md` — commits attempted on a detached HEAD
- `file-conflict.md` — concurrent local edits to the same file

## Configuration and instructions

- `corrupted-config.md` — unparsable config, fallback to last-known-good
- `conflicting-instructions.md` — instruction contradicts memory, prior turn, or another doc
- `exact-vs-inferred-target.md` — ambiguous target reference with no confident exact match
- `missing-template-variable.md` — prompt/context template rendered with a missing required variable

## Plugins and providers

- `invalid-plugin-manifest.md` — manifest fails validation at install
- `plugin-distribution-and-escalation.md` — untrusted source or post-install capability request
- `plugin-crash.md` — sandboxed plugin crashes after successful install
- `plugin-loop.md` — plugin repeatedly triggers itself
- `provider-offline.md`, `provider-timeout.md`, `provider-rate-limit.md` — provider-side failures

## Runtime and workflow

- `workflow-loop.md` — a workflow re-enters the same node without progress
- `workflow-timeout.md` — a workflow step exceeds its budget
- `duplicate-events.md` — redelivered events on the bus
- `event-schema-mismatch.md` — subscriber receives a payload from a different schema version
- `startup-deployment-failure.md` — critical-service boot failure or failed release deployment

## Storage and memory

- `disk-full.md`, `memory-full.md` — resource exhaustion
- `corrupted-cache.md`, `corrupted-memory.md` — corrupted derived/persisted state
- `memory-version-conflict.md` — synced Memory node edited on two schema versions at once

## Multi-device and sync

- `clock-skew.md`, `device-conflict.md`, `device-offline.md`,
  `partial-sync.md`, `sync-conflict.md` — see also
  `docs/28-multi-device-protocol/`

## Network

- `network.md` — total loss, high latency, DNS-resolves-but-refused, flapping

## Documentation

- `documentation-integrity-failure.md` — broken link, stale description, or conflicting duplicate definitions

## Maintenance rule

A new edge case discovered during implementation or incident review
(`docs/48-incident-response/`) is added here in the same change, not
deferred — an edge case handled correctly once but never documented is
one regression away from being handled incorrectly the second time.
