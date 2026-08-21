# FM-13: Voice, Text-to-Speech & Localization

## Purpose

Failures specific to spoken-language I/O and multi-language/multi-region support.

## Scope & Related Documents

This file is part of `docs/25-failure-modes/`, the project-wide failure-mode catalog. It must be read alongside:

- `docs/22-voice/voice-assistant.md` - `docs/22-voice/local-speech-models.md`

## Failure Catalog

Each failure is assigned a stable ID (`FM-13-0XX`) for cross-referencing from code comments, incident reports, and other failure-mode files.

| ID | Failure | Trigger Condition | Detection | Severity | Mitigation (prevent) | Recovery (respond) |
|---|---|---|---|---|---|---|
| **FM-13-001** | Wake word false positive | Background sound/speech resembles the wake word closely enough to trigger. | Activation events with no meaningful follow-up command from the user. | Low | Higher-confidence secondary verification pass after initial wake-word detection before fully activating. | No destructive recovery needed; log false-positive rate to retune the detection threshold. |
| **FM-13-002** | Missed wake word | Wake word spoken but not detected (noise, distance, mumbling). | User has to repeat the wake word; detectable via repeated near-identical utterances in a short window. | Medium | Tune sensitivity per environment/device; allow a manual activation fallback (button/tap) alongside voice. | No system-level recovery beyond retuning; ensure a non-voice activation path always exists as a fallback. |
| **FM-13-003** | Wrong transcription | ASR mishears a word, especially proper nouns, homophones, or domain-specific terms. | Downstream action doesn't match what a human transcript of the same audio would say (spot-check or user correction). | Medium | Domain-specific vocabulary biasing for ASR (project names, contacts) rather than generic language-model transcription alone. | Allow quick correction/undo of the last voice command before it's fully committed to an irreversible action. |
| **FM-13-004** | Accent problems | ASR model trained predominantly on one accent family performs worse on others. | Transcription error rate correlates with a specific accent/dialect across sessions. | Medium | Evaluate and, where possible, select ASR models/configs with broader accent coverage rather than a single narrow training distribution. | Offer text-input fallback prominently rather than forcing voice-only interaction when ASR confidence is persistently low for a user. |
| **FM-13-005** | Background noise | Ambient noise degrades ASR accuracy. | Confidence score from ASR drops correlating with detected noise floor. | Low | Noise suppression pre-processing before ASR; confidence-gate low-quality transcriptions rather than acting on them blindly. | Ask for repetition/confirmation when confidence is low, rather than silently acting on an uncertain transcription. |
| **FM-13-006** | Echo | Device's own TTS output is picked up by its own microphone, corrupting the next ASR pass. | Transcribed input closely matches recent TTS output content. | Medium | Echo cancellation (AEC) enabled by default on any device that both listens and speaks. | Mute/gate the microphone during active TTS playback as a structural safeguard, not just relying on AEC alone. |
| **FM-13-007** | Audio lag | Delay between speech and processing degrades the interaction (e.g. user talks over the response). | Round-trip latency metric exceeds a comfortable interaction threshold. | Low | Stream ASR/TTS rather than batch-process where the provider supports it, to minimize perceived latency. | No hard recovery; monitor and optimize the pipeline latency budget. |
| **FM-13-008** | Interrupted speech | User is cut off mid-sentence by premature end-of-utterance detection. | Transcription ends mid-clause in a way inconsistent with a complete thought. | Medium | Tune end-of-utterance silence threshold conservatively, and allow easy 'continue' rather than treating a cutoff as final. | Prompt 'did you mean to say more?' rather than acting on a possibly-incomplete command. |
| **FM-13-009** | Wrong pronunciation (TTS) | TTS mispronounces a proper noun, technical term, or non-native word. | User correction, or a phoneme-dictionary mismatch check for known terms. | Low | Maintain a pronunciation-override dictionary for names/terms known to be commonly mispronounced. | Add the specific mispronounced term to the override dictionary once identified. |
| **FM-13-010** | Robotic voice / long latency / audio clipping (TTS) | Under-provisioned TTS pipeline or a poor-quality voice model/config. | User feedback, or objective audio-quality metrics (naturalness score, generation latency) below target. | Low | Select a TTS model/config appropriate to the device's actual compute budget rather than always defaulting to the highest-quality (and slowest) option. | Fall back to a lighter-weight TTS model on resource-constrained devices rather than degrading with clipping/latency. |
| **FM-13-011** | Language mismatch (TTS) | TTS responds in the wrong language relative to what the user is actually speaking/expecting. | Detected input language differs from the language used for the TTS response. | Medium | Explicitly track and use the detected input language for the response, rather than a fixed default. | Detect the mismatch from user correction and switch response language for subsequent turns. |
| **FM-13-012** | Wrong language (general) | System-wide locale detection wrong, affecting more than just TTS (dates, formatting, content language). | User-facing content language doesn't match user's configured or detected locale. | Medium | Single source of truth for locale, propagated consistently to every subsystem rather than each one detecting independently. | Correct the locale setting and re-render affected content. |
| **FM-13-013** | Mixed languages | Code-switching (user mixes two languages in one utterance) confuses transcription/response. | Transcription/response quality drops specifically on multilingual utterances. | Low | Multilingual-aware ASR/response models where the user's profile indicates regular code-switching, rather than assuming monolingual input. | Fall back to asking for clarification in whichever language the confidence is higher for. |
| **FM-13-014** | Unicode corruption | Text encoding mishandled somewhere in the pipeline, corrupting non-Latin scripts. | Rendered/stored text shows replacement characters or mojibake. | Medium | UTF-8 end-to-end with explicit encoding declaration at every text I/O boundary; no implicit encoding assumptions. | Identify and fix the specific encoding boundary that dropped/mangled the data; re-process from the last known-good source if the corruption already persisted. |
| **FM-13-015** | Date/time formatting errors | Locale-specific date format (DD/MM vs MM/DD) misapplied. | Date interpreted/displayed inconsistently with the user's actual locale convention. | Medium | Always store dates in an unambiguous format (ISO 8601) internally; format for display only at the locale-aware presentation layer, per `docs/00-overview/time-semantics.md`. | Correct the display formatting; internal storage should already be unambiguous so no data correction is needed if this discipline was followed. |
| **FM-13-016** | RTL layout problems | Right-to-left language content rendered with a layout assuming LTR. | Visual inspection or automated layout test for RTL locales shows misaligned/reversed content. | Low | Test UI explicitly against RTL locales, not just translate strings and assume layout auto-adapts. | Fix the specific layout component's RTL support; add to the RTL regression test suite. |
| **FM-13-017** | Multi-device wake-word collision | Two voice-enabled devices in range both detect the same spoken wake word. | Overlapping audio prompts or duplicate processing of one utterance across devices. | Medium | The `voice.wake_claimed` mesh-broadcast coordination in `docs/22-voice/voice-assistant.md`'s Multi-device voice section — earliest timestamp wins, confidence score then device-ID as tiebreaks, 150ms claim window. | If both devices somehow proceeded (coordination itself failed, e.g. network partition mid-claim), the user-facing recovery is a single re-prompt asking the user to repeat the command, not a silent merge of two independent responses. |

## Compounding Failures

Notes on how failures in this file interact with failures elsewhere in this catalog — read these before assuming a bug is isolated to one subsystem.

- A wrong-language TTS response and a missed-wake-word failure often share a root cause: language/locale detection drifting from what the user is actually speaking — fix detection confidence at the input stage rather than patching each downstream symptom separately.

## Severity Legend

- **Critical** — data loss, security compromise, or user-visible harm; requires an incident-response runbook, not just a bug ticket.
- **High** — silent incorrectness, significant user-visible breakage, or a failure that blocks task completion with no graceful degradation.
- **Medium** — degraded quality/UX or a failure with a working but imperfect fallback.
- **Low** — cosmetic, rare, or fully recoverable with negligible user impact.
