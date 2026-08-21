# File Transfer & Media Streaming

## File transfer

Covers any file moved between paired devices (e.g. the image transfer in
`03-session-continuity-and-handoff.md`'s remote-execution example).

| Requirement | Detail |
|---|---|
| Upload | Chunked, same resumable pattern as `01-cross-device-sync.md`'s initial sync |
| Resume | Interrupted transfers resume from the last acknowledged chunk, never restart from zero |
| Retry | Bounded exponential backoff per chunk, distinct retry budget from the overall transfer so one flaky chunk doesn't exhaust the whole transfer's retry allowance |
| Cancel | User-cancelable mid-transfer; partial data is cleaned up on the receiving device, not left as an orphaned partial file (ties into `docs/25-failure-modes/FM-14` file-hygiene concerns) |
| Integrity | Per-chunk checksum verified on receipt; a failed chunk is re-requested before assembly, never silently accepted |
| Compression | Applied by default for compressible content types, skipped for already-compressed media (images/video) to avoid wasted CPU |
| Encryption | End-to-end, same guarantee as `01-cross-device-sync.md`'s sync encryption |
| Checksum | Whole-file checksum verified after assembly, independent of the per-chunk checksums, as a final integrity gate before the file is considered successfully transferred |
| Streaming | Large files (or files needed progressively, e.g. a document being OCR'd chunk-by-chunk as it arrives) support streamed consumption rather than requiring the full file to land before processing starts |

## Media streaming

Covers live voice, video, screen-share (`docs/20-devices/screen-streaming.md`), and camera feeds — distinct from file transfer because
media streaming tolerates loss/degradation in exchange for lower latency,
where file transfer never tolerates silent loss.

| Requirement | Detail |
|---|---|
| Quality | Adaptive bitrate based on measured link quality (`05-networking-and-discovery.md`'s `Healthy`/`Degraded` connection states feed directly into this) |
| Codec | Negotiated per-session based on both devices' capabilities (`04-presence-and-capabilities.md`), falling back to a universally-supported baseline codec if negotiation finds no better match |
| Latency | Target latency budget defined per stream type (voice tighter than screen-share) in `docs/11-performance/performance-goals.md`'s multi-device extension |
| Recovery | Brief drops (packet loss within the link's `Degraded` tolerance) are concealed/interpolated rather than interrupting the stream; sustained loss triggers the same `Reconnecting` transition as `05-networking-and-discovery.md`'s connection lifecycle |
| Reconnect | A stream reconnecting after a drop resumes from "now," not from the point of the drop — media streaming, unlike file transfer, does not attempt to replay missed content, consistent with its loss-tolerant design |

## Why file transfer and media streaming have opposite loss tolerance

A dropped video frame during a screen-share is imperceptible and not
worth the latency cost of guaranteeing its delivery; a dropped chunk of a
file transfer corrupts the resulting file if silently accepted. This
document's two halves deliberately specify opposite guarantees for this
reason — an implementer must never apply file-transfer's strict
per-chunk verification to a media stream (unacceptable latency) or
media-streaming's loss-tolerance to a file transfer (silent corruption).

## Related documents

- `docs/20-devices/screen-streaming.md` — screen-share specific detail
- `05-networking-and-discovery.md` — the connection-quality signal both
  transfer types key off
- `docs/10-security/encryption.md` — the encryption basis both share

## Where This Breaks

Failure modes specific to this protocol area. Cross-referenced from `docs/25-failure-modes/FM-26-multi-device-protocol.md`, which indexes all multi-device failure entries in one place, and from `FM-10-desktop-android-distributed-sync.md` for the general distributed-systems failure classes this protocol area instantiates.

| ID | Failure | Trigger | Detection | Severity | Mitigation | Recovery |
|---|---|---|---|---|---|---|
| **FM-26-023** | File transfer's chunk-level checksum passes but the whole-file checksum fails after assembly | Chunks arrive and verify individually but are assembled out of order or with an off-by-one boundary error. | Whole-file checksum mismatch despite every individual chunk having passed its own check. | Medium | Include chunk sequence/offset in the per-chunk metadata (not inferred from arrival order) so assembly is deterministic regardless of arrival order — same principle as `docs/25-failure-modes/FM-15-026`, events-out-of-order, applied to file chunks. | Re-request the full transfer (or, if offsets are preserved, just re-assemble correctly from already-received chunks) rather than silently delivering a corrupted file. |
| **FM-26-024** | Media stream's adaptive bitrate degrades quality far below what the link could actually support, due to an overly conservative quality estimator | Quality estimation logic reacts to brief link blips more aggressively than warranted, similar in shape to `FM-26-014`'s connection-state flapping. | User reports call quality far worse than the actual measured link speed would suggest. | Low | Apply hysteresis to bitrate adaptation decisions, same principle as `FM-26-014`'s fix for connection-state flapping. | Widen the adaptation hysteresis window for the affected stream; this is a tuning issue, not a correctness one. |
| **FM-26-025** | Partial file left behind after a cancelled transfer isn't actually cleaned up | Cancel handler doesn't reliably fire cleanup on every cancellation path (e.g. app killed mid-cancel vs. graceful cancel button). | Storage audit finds orphaned partial-transfer files. | Low | Treat orphaned partial-transfer cleanup as a startup-time reconciliation task (per `docs/26-system-reference/03-shutdown-sequence.md`'s resumable-cleanup pattern), not solely reliant on the cancel handler firing correctly. | `nova clean` (see `docs/27-cli/07-hidden-gold-and-ci.md`) sweeps orphaned partial-transfer files as part of its safe-cleanup scope. |
