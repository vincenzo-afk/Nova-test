# Cross-Device Memory Continuity

## Purpose

Specifies how a task or conversation started on one device (phone,
laptop, desktop) continues seamlessly on another, and how the memory
architecture (`docs/04-memory/memory-architecture.md`) — originally
scoped to a single machine — synchronizes across a paired set of devices.

## Scope

Sync mechanics and conflict resolution. Device pairing itself is
`multi-device-architecture.md`.

## What synchronizes

- **Episodic memory and conversation state** — full sync, encrypted in
  transit and at rest, so a conversation begun on the phone is visible
  and continuable on the desktop.
- **Knowledge graph** — full sync; the ontology remains fixed and
  versioned per `docs/04-memory/ontology.md`, unchanged by multi-device
  support.
- **In-flight task state** (Task Manager, `docs/03-runtime/task-manager.md`)
  — sync'd so a long-running task's progress is visible from any device,
  though execution itself continues on whichever device (typically the
  Primary Runtime) originally started it, per
  `multi-device-architecture.md`.
- **Device-local configuration** (hardware-dependent local model choices,
  device-specific permission grants) — does **not** sync by default; each
  device's Capability Registry local-provider section is independent,
  since a phone and a workstation have nothing in common to synchronize
  there.

## Sync model

Sync is pull-based against a user-controlled sync endpoint (self-hosted,
or the user's own storage account) — this is a deliberate reaffirmation
of the "not a hosted multi-tenant service" non-goal: NOVA the project
does not operate shared sync infrastructure. Each device periodically
pulls changes since its last sync checkpoint, encrypted end-to-end so the
sync endpoint itself never has plaintext access.

## Conflict resolution

Memory records carry the same lineage and versioning fields already
defined in `docs/04-memory/memory-lineage.md` and `docs/04-memory/memory-versioning.md`. A conflicting edit made on two
devices while offline from each other resolves using those existing
lineage rules (last-write-wins per field with full history retained, not
silent overwrite) — multi-device sync does not introduce a new conflict
model, it is simply another source of concurrent writes to the same
versioned store.

## Offline behavior

Any device continues operating from its local memory replica when
disconnected from the others; nothing about multi-device support makes a
single device dependent on the others being reachable for its own local
tasks. Sync resumes automatically on reconnect.

## Privacy boundary

A companion device (`android-companion.md`) that has not been granted a
given memory scope (e.g., a work-only knowledge-graph partition) does not
receive it in sync, per the existing partitioning support in
`docs/04-memory/memory-architecture.md` — multi-device sync respects
existing memory partitions rather than flattening them.

## Runtime observability and integrity bounds

The sync manager validates every remote logical checkpoint before applying changes. A checkpoint must be a non-negative safe integer and must not move backward from the local checkpoint; invalid values fail the pull without mutating local state. Encrypted envelopes are decrypted and schema-validated before partition filtering, and the local checkpoint advances only after the validated pull has been processed.

Local structured diagnostics cover pull failures, rejected envelopes, completed pulls, applied and duplicate counts, partition-filter counts, locally queued changes, and push outcomes. Diagnostics contain only bounded counts, checkpoint values, category/partition metadata, and stable reasons. Change identifiers, entity identifiers, field names, field values, plaintext envelopes, credentials, and encrypted payloads are excluded from logs.

## Related documents

- `docs/25-failure-modes/FM-10-desktop-android-distributed-sync.md` — failure modes for this subsystem
- `docs/04-memory/memory-lineage.md`, `memory-versioning.md` — conflict
  rules this reuses
- `multi-device-architecture.md` — pairing and topology
- `docs/10-security/encryption.md` — encryption-in-transit/at-rest basis
