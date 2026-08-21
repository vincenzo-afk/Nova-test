# Local and Cloud Speech Models

## Purpose

Specifies the concrete Speech-to-Text and Text-to-Speech provider
options — local and cloud — that back `voice-assistant.md`, addressing
the explicit interest in Whisper, Coqui, Sarvam, and Gemini Live as
candidate providers.

## Scope

Provider-specific characteristics relevant to selection. The abstraction
these all implement is `docs/18-providers/provider-interface.md`; the
model download/load lifecycle for the local ones is
`docs/18-providers/local-model-management.md`.

## Catalog

| Provider | Domain | Class | Notes |
|---|---|---|---|
| Whisper (and variants: faster-whisper, whisper.cpp) | STT | local | Wide language coverage; quantized variants fit `hardware-detection.md`'s Standard tier; streaming support varies by implementation — NOVA's adapter must expose partial results to satisfy `voice-assistant.md`'s streaming requirement. |
| Coqui TTS | TTS | local | Open local TTS with voice-cloning options; runs on Standard-tier hardware; used as the default local TTS in the catalog. |
| Piper | TTS | local | Lighter-weight alternative to Coqui for Minimal-tier hardware where Coqui's latency would be too high. |
| Sarvam | STT/TTS | cloud | Strong multilingual (notably Indic-language) coverage; registered as a cloud provider following `docs/18-providers/cloud-provider-management.md`. |
| Gemini Live | STT/TTS/LLM (combined realtime) | cloud | A combined realtime voice API rather than separate STT/TTS calls; its adapter implements the domain interfaces by wrapping its combined session API, so from the Planner's point of view it still looks like independent STT/TTS/LLM providers even though one underlying connection serves all three. |

## Selection guidance surfaced in the Setup Wizard

- **Privacy-first users / offline use** → Whisper + Coqui/Piper, both
  local, satisfying `voice-assistant.md`'s wake-word-always-local
  requirement and extending that preference to the full pipeline.
- **Best multilingual coverage** → Sarvam, where local model language
  coverage is insufficient for the user's languages.
- **Simplicity / single combined API** → Gemini Live, accepting the
  cloud privacy tradeoff and the coupling of STT/TTS/LLM to one vendor.

None of these is hardcoded as "the" voice stack — the Setup Wizard
presents the catalog with the guidance above as a recommendation, and any
provider satisfying the streaming interface can be substituted, including
future additions to the catalog.

## Streaming and latency requirements

Per `voice-assistant.md`, only providers implementing
`Stream<DomainChunk>` are eligible for the voice routing policy's
candidate set. Where a candidate provider (local or cloud) does not
natively stream, its adapter is excluded from voice routing rather than
wrapped in a fake streaming shim that would reintroduce round-trip
latency invisibly.

## Related documents

- `docs/25-failure-modes/FM-13-voice-tts-localization.md` — failure modes for this subsystem
- `voice-assistant.md` — the pipeline these providers plug into
- `docs/18-providers/local-model-management.md` — download/load
  lifecycle for the local entries
- `docs/18-providers/hardware-detection.md` — tier requirements
  referenced above
