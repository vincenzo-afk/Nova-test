# Recovery Flow

## Flow

On detected corruption/crash, NOVA shows a recovery banner explaining what happened in plain language, offers automatic recovery (per `docs/38-disaster-recovery/crash-recovery.md`) with a manual-inspection fallback, never auto-deletes data without an explicit confirm.

## Reference

See matching screen specs in `40-screens/` and component specs in `41-components/`.
