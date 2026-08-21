# Encryption

## Purpose

Specifies encryption-at-rest coverage across every memory storage engine,
implementing the commitment established for this project: all persistent
memory is encrypted, uniformly, with no "less sensitive" tier exempted.

## Scope

Encryption at rest for stored data. Credential-specific storage is
`secrets.md`; encryption in transit is covered per-transport in
`docs/02-architecture/communication-model.md` (local IPC) and
`docs/08-api/` (external API transport).

## Coverage

Every storage engine listed in `docs/04-memory/memory-storage.md` —
structured stores (SQLite/Postgres) for Working/Recent/Long-term Memory
and Archive, the vector database for embeddings, the graph database for
the Knowledge Graph, and blob storage for raw artifacts — is encrypted at
rest uniformly. There is no tier-based exemption; a "less important"
Working Memory record receives the same protection as a Long-term Memory
Decision record.

## Key management

The encryption key is derived from OS-level protection tied to the
logged-in user's Windows credentials (leveraging Windows' native data
protection APIs), so that the encrypted store cannot be read outside the
context of that specific user's authenticated session on that specific
machine — consistent with the single-user, single-machine v1 scope
(`docs/01-product/project-scope.md`).

## Backup encryption

Snapshots taken for backup purposes (`docs/13-devops/backup.md`) preserve
the same encryption — a backup file is not a plaintext export of
encrypted storage; it remains protected under the same key-management
model, and restoring it requires the same OS-user context that produced
it.

## What encryption does not protect against

Encryption at rest protects against a scenario where the storage files
themselves are accessed outside of a running, authenticated NOVA
instance (e.g., the machine's disk being read by another party). It does
not substitute for the access-control mechanisms in `authorization.md` or the risk-tiered execution model in `permissions.md`, which protect
against misuse by or through an already-authenticated session — these are
complementary controls addressing different threat scenarios, detailed
further in `threat-model.md`.

## Performance consideration

Encryption at rest is implemented at the storage-engine level (native
encrypted-database support where available, transparent disk/file-level
encryption otherwise) specifically to avoid adding per-query encryption/
decryption overhead that would compete with the query-latency budgets in
`docs/11-performance/performance-goals.md`.

## Related documents

- `docs/25-failure-modes/FM-12-security-sandbox-identity.md` — failure modes for this subsystem
- `docs/04-memory/memory-storage.md` — the storage engines this
  encryption covers
- `secrets.md` — the separate, additional protection model for
  credentials specifically
- `threat-model.md` — the threat scenarios encryption addresses versus
  those it does not
