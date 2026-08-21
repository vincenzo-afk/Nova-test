# Global State & Synchronization Timing

## Purpose

Extends `docs/26-system-reference/05-data-ownership.md`'s single-device
ownership rules across the paired device set, and answers the question
`01-cross-device-sync.md` deliberately left open: *exactly when* does
sync happen for each category of state.

## Global state ownership

The single-device ownership table in `docs/26-system-reference/05-data-ownership.md` still applies per-device (each device's local Memory
instance is still the sole writer of its own local storage) — what's new
across devices is which device's write is authoritative when the same
logical entity is touched from two devices:

| State category | Authoritative writer across devices |
|---|---|
| Conversation | Whichever device is active for a given turn (see `03-session-continuity-and-handoff.md`); no single device is permanently authoritative |
| Workflow | The device that originally started the workflow, unless explicitly reassigned via `docs/20-devices/distributed-task-scheduling.md` |
| Memory / Knowledge Graph | No single authoritative device — a true multi-writer store using the lineage/versioning conflict resolution from `docs/04-memory/memory-lineage.md`, same as `01-cross-device-sync.md` |
| Plugins | Each device's own plugin *state* is local; plugin *installation* propagates per `09-config-secrets-plugin-distribution.md`'s rules |
| Settings | Split: `Global`-scope settings (per `docs/14-development/configuration.md`) sync; `User`-device-local settings (hardware-dependent) do not |
| Notifications | Routed, not synced as shared state — see `07-permissions-and-notifications.md` |
| Downloads / Uploads | Local to the initiating device by default; only metadata (not the file itself) syncs unless the file is explicitly shared, per `08-file-transfer-and-media-streaming.md` |

## Sync timing

| Trigger | Applies to |
|---|---|
| On every edit (near-real-time, batched at a short interval) | Active-session conversation state, so continuity (`03-session-continuity-and-handoff.md`) feels instant |
| On save / commit boundary | Memory commits, knowledge-graph writes — synced at the same commit boundary the local write itself becomes durable, not before |
| On idle | Lower-priority categories (drafts, device-local-visible-but-not-critical settings) batch and sync once a device goes idle, to avoid constant low-value chatter while actively in use |
| On close / background | A final best-effort sync attempt, though — per the handoff design in `03-session-continuity-and-handoff.md` — correctness never depends on this succeeding, since continuity was already achieved via the on-edit/on-save triggers above |
| Periodic (background heartbeat interval) | Presence state (`04-presence-and-capabilities.md`) and catch-up sync for anything missed by the above triggers, as a safety net |

The rule in one sentence: **sync timing is chosen per category based on
how stale that category is acceptable to be**, not a single global sync
interval applied uniformly — this is why the table above exists rather
than a single "NOVA syncs every N seconds" statement.

## Related documents

- `docs/26-system-reference/05-data-ownership.md` — the single-device
  ownership rules this document extends
- `01-cross-device-sync.md` — the underlying sync mechanics
- `docs/04-memory/memory-lineage.md` — multi-writer conflict resolution

## Where This Breaks

Failure modes specific to this protocol area. Cross-referenced from `docs/25-failure-modes/FM-26-multi-device-protocol.md`, which indexes all multi-device failure entries in one place, and from `FM-10-desktop-android-distributed-sync.md` for the general distributed-systems failure classes this protocol area instantiates.

| ID | Failure | Trigger | Detection | Severity | Mitigation | Recovery |
|---|---|---|---|---|---|---|
| **FM-26-017** | A state category's sync trigger doesn't match its actual staleness tolerance | e.g. a category is put on the 'on idle' trigger but users actually need near-real-time visibility for it. | User reports a specific category feeling laggier across devices than expected. | Low | Treat the trigger-category mapping in this document as a design decision that gets revisited based on real usage feedback, not a fixed-forever assignment. | Move the specific category to a faster trigger tier; document the change and the reasoning. |
| **FM-26-018** | Two categories with different sync timing create a visible inconsistency (e.g. conversation shows a reply referencing a memory fact that hasn't synced yet) | Fast-syncing conversation state outruns slower-syncing memory state that it logically depends on. | User/agent on the receiving device sees a reference to information not yet present locally. | Medium | Where a fast-syncing category logically depends on a slower one, either bundle them into the same sync trigger, or make the fast category self-contained enough not to require the slower one to already be present (e.g. inline the needed fact rather than referencing it). | Trigger an immediate targeted sync of the specific dependency when this gap is detected, rather than waiting for its normal trigger. |
| **FM-26-019** | See also `docs/25-failure-modes/FM-10-018`, `FM-10-023` | Conflicting updates and eventual-consistency violations are the general failure classes this timing model is designed to minimize the surface area of, not eliminate entirely. | See `FM-10-desktop-android-distributed-sync.md`. | — | See FM-10. | See FM-10. |
