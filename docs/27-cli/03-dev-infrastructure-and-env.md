# Developer Infrastructure & Environment

## Dev Container

`.devcontainer/` — opening the repository in VS Code (or any
devcontainer-compatible editor) produces a fully working environment with
no manual setup: correct toolchain versions, pre-installed dependencies,
and `nova doctor` passing on first open.

## Nix

`flake.nix` — a fully reproducible environment via `nix develop`,
pinning every dependency (including system libraries `FFmpeg`/`CUDA`
that Docker/devcontainer approaches sometimes leave to the host). This is
the recommended path for contributors who want bit-for-bit reproducible
builds across machines.

## Docker Dev

`docker compose up` brings up the full local stack (NOVA core, a local
model runtime, any configured local services) in one command, using the
same images `docs/13-devops/deployment.md` builds for production, so a
contributor's local environment matches production topology, not a
divergent dev-only shortcut.

## One-line install

| Platform | Command |
|---|---|
| Linux | `curl -fsSL https://nova.dev/install.sh \| sh` |
| Windows | `winget install nova` |
| macOS | `brew install nova` |

Every one-line installer verifies a checksum/signature before executing
anything (see `docs/25-failure-modes/FM-12-016`, supply-chain
compromise) — none of these pipe an unverified download directly to a
shell without that check.

## `nova env`

Reports the detected environment in a single view:

```
GPU:        NVIDIA RTX 4070 (12GB, CUDA 12.4)
RAM:        32 GB (18 GB available)
CPU:        16 cores
Providers:  Ollama (local, healthy), Anthropic (configured), OpenAI (configured)
Voice:      Wake-word model loaded, TTS: local-tts-lite
Models:     3 local models cached (7.2 GB)
Plugins:    4 installed, 4 active
Network:    Online, mesh: Tailscale (connected, 2 peers)
Storage:    412 GB free / 1 TB
```

Feeds directly into `nova doctor`'s hardware-dependent checks and into
`docs/18-providers/hardware-detection.md`'s capability-registration
logic — `nova env`'s output and the Capability Registry's live view of
the same hardware must never disagree (see Where This Breaks below).

## `nova config`

View and edit the fully-resolved configuration (after precedence
resolution across scopes, per `docs/14-development/configuration.md`) —
not just the raw YAML file, since a raw file alone doesn't show what a
`Global` default was overridden to at `User` scope. Supports `nova config get <key>`, `nova config set <key> <value>` (validated against
`docs/14-development/configuration-schema.md` before writing), and `nova config diff` (resolved vs. file-declared, to surface any runtime
override).

## Related documents

- `docs/18-providers/hardware-detection.md` — the detection logic `nova env` surfaces
- `docs/14-development/configuration.md`, `configuration-schema.md` —
  what `nova config` reads/writes- `docs/25-failure-modes/FM-12-016` — supply-chain verification the
  one-line installers must perform

## Where This Breaks

Failure modes specific to this command group. Cross-referenced from `docs/25-failure-modes/FM-25-cli-infrastructure.md`, which indexes all CLI failure entries in one place.

| ID | Failure | Trigger | Detection | Severity | Mitigation | Recovery |
|---|---|---|---|---|---|---|
| **FM-25-008** | `nova env`'s report disagrees with the live Capability Registry | Detection is cached/stale in one but not the other (same root cause as `FM-04-004`, ignore-local-model). | Cross-check test compares `nova env --json` output against a live Capability Registry query. | Medium | Both must read from the same underlying `docs/18-providers/hardware-detection.md` detection call, not maintain separate caches. | Refresh whichever side is stale; converge on a single detection source if the drift recurs. |
| **FM-25-009** | One-line installer skips signature verification on a fallback path | An edge-case install path (e.g. air-gapped install, mirror fallback) bypasses the primary verified-download path without carrying the same check. | Security audit of all install code paths, not just the primary documented one. | Critical | Every install path, including fallbacks and mirrors, must perform the same signature check — no path is exempt 'because it's rare.' | Treat as a supply-chain incident per `FM-12-016`; patch the bypassed path immediately. |
| **FM-25-010** | `nova config set` writes a value that later fails schema validation on next load | A value passes a looser CLI-side check than the full schema validator used at runtime load. | Startup fails with `NOVA-CFG001` despite `nova config set` having reported success. | Medium | `nova config set` must validate against the exact same schema validator used at runtime load, not a lighter CLI-specific check. | Fix the validation-logic divergence; `nova repair` must be able to revert the specific bad value using the pre-write snapshot. |
