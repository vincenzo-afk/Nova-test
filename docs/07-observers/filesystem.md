# Filesystem Observer

## Purpose

Watches for file and directory changes within user-granted folder scopes
and normalizes them into the event taxonomy consumed by Memory and the
Knowledge Graph.

## Scope

Filesystem-specific capture logic. Shared framework behavior (permission
gating, normalization contract) is `docs/03-runtime/observer.md`.

## Permission scope

Granted per folder, not filesystem-wide by default — the permission
center (`docs/10-security/permissions.md`) presents folder selection
explicitly at first install (`docs/01-product/user-journeys.md`, Journey
1) and at any later point the user chooses to expand or narrow scope.
System directories, hidden files, and the OS's own program directories
are excluded from observation by default regardless of folder grants,
since they are not part of the user's own project/document workspace this
observer exists to understand.

## Captured event types

Create, modify, delete, move, and rename, each carrying the affected
path, a content hash (for files below a size threshold; larger files are
hashed lazily in the background), and file type/extension metadata.

## Event storm handling

Bulk operations (git clone, archive extraction) are debounced, coalesced,
and batched per `docs/02-architecture/event-driven-architecture.md`
before reaching the bus — the Filesystem Observer is the primary source
of the event-storm scenario that document's handling was designed
around, given how common large repository operations are for the primary
Developer persona (`docs/01-product/user-personas.md`).

## Distinguishing NOVA-caused from user-caused changes

Per `docs/03-runtime/observer.md`'s correlation mechanism, a file change
caused by an Executor action in flight is tagged with that task's
`correlation_id` rather than being indexed as an independent new user
action — this prevents, for example, a NOVA-driven file reorganization
task from being misread by Memory as the user manually reorganizing
files.

## Symlinks and junctions

Symbolic links and directory junctions are observed as themselves (the
link entity), not silently resolved to their targets, to avoid
double-counting or misattributing events when a target is reached via
multiple link paths.

## Related documents

- `docs/25-failure-modes/FM-14-files-storage-documents-cache.md` — failure modes for this subsystem
- `docs/03-runtime/observer.md` — the shared framework this source
  implements
- `docs/02-architecture/event-driven-architecture.md` — event-storm
  handling this source relies on heavily
- `docs/10-security/permissions.md` — the per-folder permission model
