# Installation

## Purpose

Describes the installer experience and first-run sequence, directly
implementing Journey 1 (Cold Start) from `docs/01-product/user-journeys.md`.

## Scope

Installer mechanics and first-run flow. Ongoing update mechanics after
initial installation are `updates.md`.

## Installer steps

1. Standard Windows installer package registers the NOVA Windows service
   (`deployment.md`) and the UI Layer application, without starting
   observation of anything yet.
2. On first launch, the Desktop application (`docs/09-ui/desktop.md`)
   presents the permission center before any other functionality,
   consistent with `docs/01-product/user-journeys.md` Journey 1 — no
   observer begins capturing before its specific permission is granted.
3. The user selectively grants observation permissions (per-folder
   filesystem scope, and any other sources they choose,
   `docs/10-security/permissions.md`).
4. NOVA performs the initial scan described in
   `docs/01-product/user-journeys.md` (installed applications, currently
   open projects/files matching granted folders, explicit imports),
   populating the Knowledge Graph's initial entities.
5. The user is immediately able to query NOVA about what it has just
   scanned, even with no accumulated history yet — the cold-start
   experience is designed to feel useful immediately, not "empty until
   trained."

## Current repository bootstrap boundary

The repository currently provides `pnpm install:windows` as a non-destructive source-checkout bootstrap for development and verification. It installs the frozen workspace dependencies, builds the Electron desktop package, and creates user-scoped data directories. It does not produce the standard Windows installer package described in step 1, install third-party software, delete data, download arbitrary files, or start observers. The packaged installer and full host/UI packaging remain a separate release milestone and must not be implied by the bootstrap command.

A packaged host can be registered separately with `pnpm register:windows-service` on Windows. The command requires `NOVA_HOST_EXECUTABLE` and `NOVA_SERVICE_ACCOUNT`, creates an auto-start `NovaHost` service with Service Control Manager restart recovery, and prompts for the account password only while executing the registration. The command refuses non-Windows hosts and never accepts the password through an environment variable or stores it in the service plan.

The browser Native Messaging host can be registered separately with `pnpm register:windows-browser-host` on Windows after the extension has been installed. Set `NOVA_BROWSER_EXTENSION_ID` to the installed 32-character Chrome extension ID, `NOVA_NATIVE_HOST_EXECUTABLE` to the absolute host executable or launcher path, and `NOVA_NATIVE_HOST_MANIFEST_DIR` to an absolute user-scoped directory for `com.nova.browser.json`. The command materializes a placeholder-free manifest and registers it under the current user’s Chrome Native Messaging registry key with `reg.exe`; it does not modify machine-wide registry state, install the extension, or start observation. It refuses non-Windows hosts and must be rerun if the extension ID or host path changes.

The standard NSIS artifact is built with `pnpm package:windows` on a Windows build host. The build uses the Electron main entry, renderer assets, runtime workspace packages, Prisma client, migrations, and a per-user installation configuration. The source-checkout bootstrap and explicit service/browser-host registration commands remain separate from this packaging command.

## No silent background activity before consent

This is a hard requirement of the installer sequence, not an
implementation detail: no Observer process begins capturing any data
until step 3 above completes for that specific source — the installer
itself performs no observation, and neither does the NOVA service
between installation completing and the user reaching the permission
center on first launch.

## Uninstallation

Uninstalling NOVA removes the registered Windows service and, per an
explicit prompt (not a silent default), offers the choice to retain or
delete accumulated Memory/Knowledge Graph data — deletion is not the
automatic default, since a user reinstalling later may want their
history preserved, but retention is never silent either; the choice is
always presented explicitly.

## Related documents

- `docs/25-failure-modes/FM-20-deployment-and-evolution.md` — failure modes for this subsystem
- `deployment.md` — the service registration this installer performs
- `docs/01-product/user-journeys.md` — Journey 1, which this document
  implements
- `docs/10-security/permissions.md` — the permission center shown during
  first run
