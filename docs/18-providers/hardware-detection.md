# Hardware Detection

## Purpose

Determines what local providers (models) the current machine can
realistically run, so the Setup Wizard and Capability Registry never
offer a local option that would be unusable or would degrade the whole
system.

## Scope

Detection signals, capability tiers, and how detection results feed
provider recommendations. Not the local model runtime itself
(`local-model-management.md`).

## Detected signals

- CPU: core count, architecture (x86_64 / ARM), AVX2/AVX-512 support
- GPU: vendor, VRAM, CUDA/ROCm/Metal availability
- System RAM
- Available disk space at the configured model-storage path
- Current OS (per `docs/20-devices/multi-device-architecture.md`, this
  now varies per device rather than being fixed to Windows)
- Battery/power state on portable devices (informs whether to recommend
  local inference at all vs. deferring to cloud to save power)

Detection runs once at first setup and again on demand from Settings
("Re-scan hardware"), since users upgrade GPUs or add machines.

## Capability tiers

Detection maps the machine to a tier per model family (LLM, vision,
speech), not a single global tier:

| Tier     | Typical hardware                                      | Recommendation                                                                      |
| -------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Minimal  | No dedicated GPU, <16GB RAM                           | Cloud providers recommended for LLM/vision; small local STT/TTS models still viable |
| Standard | Consumer GPU, 8-16GB VRAM                             | Mid-size local LLM (quantized) and full local speech stack viable                   |
| High     | 24GB+ VRAM or Apple Silicon with 32GB+ unified memory | Larger local LLM and vision models viable; local-first fully practical              |

Tiers are advisory input to the Setup Wizard's provider picker
(`docs/19-setup/setup-wizard.md`) — the user can always override and
choose a cloud provider on high-tier hardware, or attempt a local model
above the recommended tier (with a performance warning, not a block). The
shared Capability Registry compares each local provider descriptor's
`minimum_hardware_tier` with `HardwareProfile.overall_tier` and returns a
stable recommendation label: `recommended` when the minimum is met, or
`available-but-unrecommended` when it is not. Providers without a declared
minimum and cloud providers remain available without a fabricated hardware
claim.

## Re-evaluation triggers

- Manual re-scan
- New device added to the multi-device mesh
  (`docs/20-devices/multi-device-architecture.md`)
- A local provider's `healthCheck()` repeatedly times out in a way
  consistent with resource exhaustion — triggers a one-time suggestion to
  re-scan or step down to a smaller local model, not an automatic model
  swap

## Output

Hardware detection does not itself configure anything — it produces a
`HardwareProfile` consumed by:

- The Setup Wizard, to pre-filter which local providers to list as
  recommended vs. available-but-unrecommended
- `provider-routing.md`'s privacy-first policy, to decide whether "local"
  is even a real option for a given capability on this device

## Related documents

- `docs/25-failure-modes/FM-04-model-router-provider-fallback.md` — failure modes for this subsystem
- `local-model-management.md` — what happens once a local model is chosen
- `docs/19-setup/setup-wizard.md` — where detection results surface first
- `docs/20-devices/multi-device-architecture.md` — per-device hardware
  profiles in a multi-device mesh
