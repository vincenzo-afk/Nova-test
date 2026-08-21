# Resource Arbitration & Offline Mode

## Resource arbitration

Example: Desktop and Phone both want the microphone at the same moment
(Desktop for a dictation task, Phone for a wake-word-triggered voice
command).

| Rule | Detail |
|---|---|
| Local-device resources are never remotely preemptable without consent | A remote request for a resource currently in local use on the target device is queued or denied, never silently preempted — consistent with `07-permissions-and-notifications.md`'s consent-gated capability-request model |
| Local use always wins over a remote request by default | If Phone's own user is actively using its microphone for a local wake-word interaction, a concurrent remote request from Desktop is queued (not granted) until the local use completes, mirroring `docs/25-failure-modes/FM-13`'s presumption that the device's own immediate user takes priority |
| Explicit override exists but is never silent | A user can configure "always prioritize Desktop's requests" as an explicit preference; absent that, the default above applies |
| Arbitration uses the same Resource Manager pattern as single-device locking | `docs/03-runtime/resource-manager.md`'s lock-acquire-or-queue model extends across devices via the mesh transport (`05-networking-and-discovery.md`), rather than inventing a separate cross-device locking mechanism |

## Offline behavior

This is the most consequential document in this whole folder for
day-to-day usability — most multi-device usage happens with devices
intermittently, not continuously, connected.

| Works offline | Doesn't work offline |
|---|---|
| Full local conversation/task execution against local Memory replica | Any capability only the *other* device has (e.g. Phone needing Desktop's GPU for a heavy local-inference task) |
| Local tool execution, local plugin execution | Remote execution requests (`03-session-continuity-and-handoff.md`) |
| Reading any already-synced memory/knowledge-graph state | Seeing the *other* device's changes made since the last successful sync (by definition) |
| Queuing actions that need the other device, for later | Actually completing those queued actions until reconnect |
| Voice interaction using local wake-word/ASR/TTS models | Cloud-provider-backed voice processing if configured as the only voice provider and no local fallback exists (`docs/25-failure-modes/FM-04-010`'s all-providers-exhausted case) |

**How sync resumes**: automatically, per `01-cross-device-sync.md`'s
Offline sync and Sync retry sections — no manual "reconnect" action is
required from the user; the moment connectivity returns
(`05-networking-and-discovery.md`'s `Reconnecting → Connected`
transition), sync resumes from the last checkpoint.

**Conflict rules while offline**: unchanged from `01-cross-device-sync.md` — offline editing is simply another source of concurrent writes
resolved by the same memory-lineage rules once devices reconnect; there
is no special "offline mode" conflict model distinct from the general
one.

## Related documents

- `docs/03-runtime/resource-manager.md` — the single-device lock model
  extended here
- `01-cross-device-sync.md` — offline sync and retry mechanics in full
- `04-presence-and-capabilities.md` — the `Offline` presence state this
  document details the behavioral consequences of

## Where This Breaks

Failure modes specific to this protocol area. Cross-referenced from `docs/25-failure-modes/FM-26-multi-device-protocol.md`, which indexes all multi-device failure entries in one place, and from `FM-10-desktop-android-distributed-sync.md` for the general distributed-systems failure classes this protocol area instantiates.

| ID | Failure | Trigger | Detection | Severity | Mitigation | Recovery |
|---|---|---|---|---|---|---|
| **FM-26-036** | Resource arbitration queue for a remote request grows unbounded while the local device stays continuously busy | Same starvation shape as `docs/25-failure-modes/FM-02-012`, applied to cross-device resource contention. | Remote request wait time for a specific resource grows without bound across repeated local-use sessions. | Medium | Apply the same aging-based priority boost pattern referenced throughout this folder (`FM-26-002`) to cross-device resource arbitration specifically. | Grant the remote request once its queued age crosses a threshold, even if local use would otherwise have continued winning by default. |
| **FM-26-037** | User is misled about what's actually available offline because the UI doesn't clearly distinguish 'queued for later' from 'failed' | An action that will complete once reconnected looks, in the UI, identical to one that permanently failed. | User reports confusion or abandons a task that was actually going to complete automatically on reconnect. | Low | Offline-queued actions must be visually/programmatically distinct from failed actions at every surface (CLI `--json` output included, per `docs/27-cli/01-cli-overview.md`'s scriptability principle), never collapsed into one generic 'error' state. | Fix the specific UI/output surface conflating the two states; this is a correctness bug in status reporting, not data loss. |
| **FM-26-038** | A user's explicit override preference (e.g. 'always prioritize Desktop') isn't actually applied because it's a `User`-scope config that failed to sync to the arbitrating device | Ties directly to `06-global-state-and-sync-timing.md`'s settings-sync category and `09-config-secrets-plugin-distribution.md`'s sync-eligibility rules — if this preference isn't marked syncable, it silently only applies on the device it was set on. | Arbitration behaves per-default on a device where the user believes they configured an override. | Low | Explicitly mark cross-device-behavior preferences (like arbitration overrides) as syncable in their schema definition, per `FM-26-026`'s mitigation, since this is exactly the class of config this document's own logic depends on being consistent everywhere. | Correct the schema's sync-eligibility flag for the specific preference; re-sync it to all devices once fixed. |
