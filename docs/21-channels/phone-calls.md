# Phone Calls

## Purpose

Specifies phone calls as a capability domain: NOVA answering, screening,
placing, or participating in voice calls, bridging the Voice
(`docs/22-voice/voice-assistant.md`) and Channel
(`messaging-platforms.md`) abstractions to real telephony.

## Scope

Telephony provider integration and call-handling flow. The speech
recognition/synthesis used during a call is the existing Voice domain,
reused rather than reimplemented.

## Provider model

Telephony is a Provider domain with adapters for: the Android
Companion's native telephony access (`docs/20-devices/android-companion.md`,
via Android's Call Screening/Telecom APIs, subject to those APIs'
platform restrictions), and VoIP providers (e.g., a SIP/VoIP API) for
desktop-originated or desktop-received calls.

## Modes

- **Screening** — an incoming call is transcribed live (STT provider) and
  summarized for the user before they choose to answer, decline, or let
  NOVA continue.
- **Assisted answering** — NOVA answers on the user's behalf for a
  narrow, pre-authorized class of calls (e.g., known spam patterns, or a
  configured "take a message" mode), speaking through the TTS provider
  and logging a transcript/summary — never impersonating the user in a
  way that isn't disclosed to the caller; NOVA identifies itself as an
  assistant when answering on the user's behalf.
- **Placing calls** — NOVA places a call and either connects the user
  directly once answered, or (for a narrow, explicitly authorized task
  like a scripted confirmation call) conducts a short, disclosed
  automated interaction.
- **Participating** — during a user-driven call, NOVA can listen (with
  both-party disclosure where legally required, which varies by
  jurisdiction and is surfaced to the user rather than assumed) and
  provide live suggestions through a private channel (e.g., screen
  overlay) without being audible on the call itself.

## Consent and disclosure

Because call recording/transcription consent law varies by jurisdiction,
NOVA surfaces a jurisdiction-aware disclosure reminder before enabling
call transcription or assisted answering, and never silently records a
call the user hasn't explicitly enabled transcription for.

## Confirmation gates

Placing a call is a real-world, hard-to-reverse action once connected;
initiating any outbound call requires explicit confirmation of the
number and purpose beforehand, per `docs/10-security/permissions.md`.

## Related documents

- `docs/25-failure-modes/FM-11-internet-and-external-apis.md` — failure modes for this subsystem
- `docs/22-voice/voice-assistant.md` — STT/TTS pipeline reused for calls
- `docs/20-devices/android-companion.md` — native telephony access source
- `docs/10-security/permissions.md` — outbound-call confirmation gate
