# Device Pairing Flow

## Flow

New device → shows pairing code → primary device confirms → session keys exchanged per `28-multi-device-protocol/` → new device performs initial sync (chunked, resumable) → paired device appears in device list with revoke action always visible.

## Reference

See matching screen specs in `40-screens/` and component specs in `41-components/`.
