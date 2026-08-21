# Deployment

## Purpose

Specifies how NOVA is deployed and run as a genuine Windows background
service, the foundation `docs/02-architecture/lifecycle.md`'s startup/
shutdown sequence and `docs/03-runtime/runtime-manager.md`'s supervision
model both assume.

## Scope

Deployment topology and service registration mechanics. First-run
installation experience is `installation.md`; update mechanics are
`updates.md`.

## Windows Service registration

NOVA registers as a genuine Windows service (not merely a background
executable), which is what allows the Windows Service Control Manager to
provide the outermost restart safety net referenced in
`docs/03-runtime/runtime-manager.md` — if the entire NOVA host process
terminates unexpectedly, the Service Control Manager restarts it, which
in turn re-invokes Runtime Manager's own startup and supervision logic.

## Process topology at deployment

Consistent with `docs/02-architecture/system-architecture.md`, deployment
consists of: the NOVA host process (hosting the supervised service
processes under Runtime Manager), and the separate, unprivileged UI Layer
process, launched independently and connecting via the API Gateway —
these are registered and started as distinct OS-level entities, not a
single combined executable.

## Privilege level

The NOVA host process runs under the logged-in user's own account
context, not as SYSTEM or an elevated service account — consistent with
`docs/01-product/project-scope.md`'s single-user model and
`docs/10-security/authentication.md`'s OS-user-bound identity, NOVA never
requires broader privilege than the user it is acting on behalf of
already has.

## Configuration deployment

Provider configuration (`docs/05-ai/model-providers.md`), permission
grants (`docs/10-security/permissions.md`), and other user settings are
stored in a user-scoped configuration location, separate from the memory/
graph storage described in `docs/04-memory/memory-storage.md`, so that
configuration and data have independent backup/restore lifecycles where
appropriate (`backup.md`).

## Related documents

- `docs/25-failure-modes/FM-20-deployment-and-evolution.md` — failure modes for this subsystem
- `docs/02-architecture/system-architecture.md`, `lifecycle.md` — the
  process topology and startup sequence this deployment model supports
- `docs/03-runtime/runtime-manager.md` — the supervision this deployment
  enables
- `installation.md` — the first-run experience built on this deployment
  model
