# Storage Layout

## Purpose

Specifies the literal on-disk directory structure NOVA uses, and the
purpose of each folder — distinct from `docs/04-memory/memory-storage.md`,
which specifies which storage *engine* (SQLite, vector DB, graph DB)
backs each memory tier. This document is about the filesystem layout
those engines and other NOVA components write into.

## Scope

Directory structure and folder purpose. Storage engine selection per
memory tier remains `docs/04-memory/memory-storage.md`.

## Directory structure

```
NOVA/
├── config/              # docs/14-development/configuration.md — user,
│                         # project, and workspace-scoped settings
├── secrets/              # never contains actual secret values — a
│                         # pointer/reference file only; real secrets
│                         # live in the OS credential vault,
│                         # docs/10-security/secrets.md
├── memory/
│   ├── structured/       # SQLite/Postgres files — Working/Recent/
│   │                     # Long-term memory metadata
│   ├── vector/           # embedding index files
│   ├── graph/            # Knowledge Graph database files
│   └── blobs/            # raw artifacts (large documents, etc.)
├── archive/              # docs/04-memory/memory-lifecycle.md's Archive
│                         # tier — separate from memory/ so archive-tier
│                         # I/O never competes with active-tier access
├── logs/                 # docs/13-devops/logging.md diagnostic logs
├── cache/                # ephemeral — safe to delete entirely; NOVA
│                         # rebuilds it as needed (e.g., cached routing
│                         # decisions, docs/11-performance/caching.md)
├── plugins/               # installed plugin packages,
│                         # docs/16-extensibility/plugin-architecture.md
├── extensions/            # reserved for non-plugin extension artifacts
│                         # (e.g., custom UI themes) — distinct from
│                         # plugins/ specifically for code/tool bundles
├── models/                 # local model files, where the user has
│                         # configured local inference,
│                         # docs/05-ai/model-providers.md
├── backups/                # periodic full snapshots,
│                         # docs/13-devops/backup.md
├── snapshots/              # pre-update snapshots specifically,
│                         # docs/13-devops/updates.md — kept separate
│                         # from backups/ since they have a different
│                         # retention policy (tied to update history,
│                         # not a rolling window)
├── workspace/               # per-Project working files NOVA itself
│                         # creates (not the user's own project files,
│                         # which stay wherever the user placed them —
│                         # this is NOVA's own scratch/output space)
└── temp/                    # ephemeral, cleared on clean shutdown
                            # (docs/02-architecture/lifecycle.md);
                            # anything left here after an unclean
                            # shutdown is cleaned up on next startup
```

## Why `cache/` and `temp/` are both ephemeral but distinct

`cache/` persists across restarts and is a performance optimization
(rebuildable, never authoritative) — deleting it costs performance but
not correctness. `temp/` is scoped to the current running session and is
not expected to persist across a restart at all; anything found there on
startup is stale by definition and cleared, per the crash-recovery
sequence in `docs/02-architecture/lifecycle.md`.

## Why `secrets/` contains no actual secrets

Consistent with `docs/10-security/secrets.md`'s reference-not-value
pattern, this folder exists only for the reference/pointer records
identifying which OS credential vault entry corresponds to which
provider/plugin — the actual credential values never touch NOVA's own
filesystem storage at all.

## Permission and encryption scope

`memory/`, `archive/`, `backups/`, and `snapshots/` are encrypted at
rest uniformly (`docs/10-security/encryption.md`); `cache/` and `temp/`
are not encrypted, since they never contain durable or uniquely
sensitive content beyond what is already protected in `memory/`.

## Related documents

- `docs/25-failure-modes/FM-14-files-storage-documents-cache.md` — failure modes for this subsystem
- `docs/04-memory/memory-storage.md` — the storage engines within
  `memory/` - `docs/10-security/secrets.md`, `encryption.md` — the security model
  applied to specific folders above
- `docs/13-devops/backup.md`, `updates.md` — the distinct retention
  policies for `backups/` versus `snapshots/`
