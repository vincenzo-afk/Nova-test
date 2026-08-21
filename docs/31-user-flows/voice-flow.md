# Voice Flow

## Flow

Wake word / push-to-talk → local speech-to-text (`docs/22-voice/local-speech-models.md`) → same Planner path as chat → TTS response, with a visible transcript always shown simultaneously for accessibility and confirmation. Failure branch: STT low-confidence → NOVA reads back its interpretation before acting, rather than acting on a guess.

## Reference

See matching screen specs in `40-screens/` and component specs in `41-components/`.
