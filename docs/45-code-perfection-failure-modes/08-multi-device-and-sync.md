# Landmines: Multi-Device & Sync


## Where this breaks

1. **Clock skew between devices not accounted for** — using device-local
   timestamps to order sync events without a logical clock (vector clock
   / Lamport timestamp) or server-assigned ordering produces
   nondeterministic "last write wins" results that vary by device clock
   drift.
2. **Sync conflict resolution implemented only for the common case**
   (two devices, one field changed) and untested for N-way conflicts or
   simultaneous deletes-vs-edits, which are exactly the cases
   `docs/04-memory/memory-conflict-resolution.md` exists to define.
3. **Partial sync failure leaving one device ahead of another with no
   resumability** — a sync that fails halfway through a batch must be
   resumable from a checkpoint, not restart-from-zero (wasteful) or
   silently skip the unsynced remainder (data loss).
4. **Protocol version negotiation missing**, so a device running an
   older protocol version silently misinterprets a newer message shape
   instead of rejecting it or requesting a compatible format — always
   version the wire protocol per `28-multi-device-protocol/` and fail
   loudly on an unknown version.
5. **Device pairing not invalidating stale sessions on re-pair** —
   re-pairing a device must revoke the previous session's credentials,
   not leave both valid, which would let a lost/stolen device retain
   access silently.
6. **Large payload sync (e.g. full Knowledge Graph resync) not chunked**,
   causing timeouts or memory spikes on lower-powered devices (notably
   the Android companion).
