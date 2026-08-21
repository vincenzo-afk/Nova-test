# Automatic Software Installation

## Purpose

Specifies NOVA's ability to identify that a task needs external
software NOVA does not itself provide as a plugin (e.g., "I need OBS to
do this recording"), and to download, install, and configure it, gated
by explicit confirmation at each irreversible step.

## Scope

Third-party application installation, distinct from
`autonomous-plugin-discovery.md`'s NOVA-plugin/MCP-server scope. This
document covers installing whole external applications onto the host
OS.

## Trigger

Analogous to the Capability Gap event in
`autonomous-plugin-discovery.md`, but for a task requiring a specific
named application NOVA has no provider/plugin path to (e.g., a task that
inherently requires OBS Studio running on the machine, not something
NOVA can provide an internal capability for).

## Flow

1. **Identify** — the Planner determines the specific application (and,
   where relevant, minimum version) the task requires.
2. **Source verification** — NOVA resolves the application's official
   distribution source (vendor site, verified package manager such as
   winget/Homebrew/apt, per platform) and never a mirrored or
   third-party-hosted binary — this is treated as a strict requirement
   under `docs/10-security/supply-chain-security.md`, not a preference.
3. **Propose** — presents the user with what will be installed, from
   where, and why, before proceeding: "This task needs OBS Studio. I'd
   install it via winget from the official source. Proceed?"
4. **Install** — on confirmation, runs the installation through the
   platform's package manager where available (preferred, since it
   provides checksum verification and clean uninstall) or the vendor's
   official installer as a fallback, inside the same sandboxing
   boundary used for any Tier 3/4 execution
   (`docs/06-tools/execution-priority.md`).
5. **Configure** — where the task requires specific settings (e.g., OBS
   scene/source setup), NOVA configures them through the application's
   own automation surface (CLI flags, config file, its API/plugin system
   if one exists) rather than GUI automation where a cleaner path exists,
   per the existing execution-priority ordering.
6. **Confirm and use** — reports what was installed/configured, then
   proceeds with the original task.

## Hard limits

- Never installs from an unverified or non-official source, regardless
  of how the task is framed.
- Never installs without the explicit confirmation in step 3 — this is
  an irreversible-class action (it modifies the host system) and follows
  `docs/10-security/permissions.md` without exception.
- Uninstall is offered symmetrically: NOVA can track what it installed on
  the user's behalf and offer to remove it later, but never uninstalls
  without equivalent explicit confirmation.

## Related documents

- `docs/25-failure-modes/FM-18-autonomy-policy-approval.md` — failure modes for this subsystem
- `autonomous-plugin-discovery.md` — the NOVA-internal-plugin counterpart
- `docs/10-security/supply-chain-security.md` — source-verification rules
- `docs/06-tools/execution-priority.md` — automation-over-GUI ordering
  applied to post-install configuration
