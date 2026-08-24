# Local Model Management

## Purpose

Specifies how on-device models (LLM, vision, speech-to-text,
text-to-speech, embeddings, OCR, reranking) are discovered, downloaded,
versioned, loaded, and retired, so local providers are as manageable as
cloud ones rather than a folder of files the user tracks by hand.

## Scope

Local model lifecycle. Which local model is used for a given call is
`provider-routing.md`; whether the hardware can run it is
`hardware-detection.md`.

## Model catalog

NOVA ships a curated catalog of known-good local models per domain (e.g.,
Whisper variants for STT, Coqui/Piper for TTS, a small set of vetted
quantized LLMs). Each catalog entry declares: download source and
checksum, disk size, minimum hardware tier
(`hardware-detection.md`), and which `Provider` adapter loads it. The
catalog is data, not code — adding a new supported local model is a
catalog entry plus, if its runtime format is genuinely new, a new adapter
implementing `provider-interface.md`; it is never a NOVA Core change.

## Lifecycle

1. **Discover** — Setup Wizard or Settings lists catalog entries filtered
   by the current `HardwareProfile`.
2. **Download** — fetched over HTTPS with checksum verification; stored
   under a configurable model-storage path, never inside the application
   install directory.
3. **Load** — the domain's Provider adapter loads the model into the
   appropriate runtime (llama.cpp-style for LLMs, ONNX/torch runtime for
   speech models, etc.), reporting readiness through `healthCheck()`.
4. **Version** — multiple versions of the same model family can coexist
   on disk; the Capability Registry entry pins a specific version, and
   switching versions is a registry edit, not a reinstall.
5. **Retire** — unused model files are flagged (not auto-deleted) after a
   configurable idle period, surfaced in Settings as reclaimable disk
   space, deleted only on explicit confirmation.

The runtime `LocalModelManager` implements the catalog-backed lifecycle
boundary. Its discovery result carries the model/provider/domain metadata,
minimum hardware tier, advisory availability label, and local lifecycle
status. Downloads accept only HTTPS catalog URLs, verify the exact byte
length and SHA-256 checksum before an atomic rename into the configured
storage directory, and leave no unverified file behind. Loading is delegated
to the catalog entry's adapter callback only after the stored file is
verified again. Retirement changes metadata to `reclaimable` and never
deletes model bytes; deletion is a separate explicit user action.
Concurrent requests for the same model share one bounded download operation.

## User-supplied models

Users may point NOVA at a local model file or directory outside the
catalog (e.g., a custom fine-tune). This registers as a provider with
`privacy_class: local` and an `unverified: true` flag, which
`provider-routing.md` surfaces to the user before first use, and which
`docs/10-security/supply-chain-security.md` treats as untrusted input
subject to the same sandboxing as any third-party plugin code.

## Resource management

Loaded local models are tracked by the Resource Manager
(`docs/03-runtime/resource-manager.md`) alongside every other runtime
resource, so a large local LLM and a large local vision model don't
silently compete for the same VRAM without NOVA being aware — the
Resource Manager can refuse to load a second model that would exceed
detected capacity and surface that as a clear message rather than an OOM
crash.

## Related documents

- `docs/25-failure-modes/FM-04-model-router-provider-fallback.md` — failure modes for this subsystem
- `hardware-detection.md` — feeds the filtering in step 1
- `provider-interface.md` — the adapter contract each model loads behind
- `docs/03-runtime/resource-manager.md` — runtime resource accounting
- `docs/10-security/supply-chain-security.md` — trust handling for
  user-supplied models
