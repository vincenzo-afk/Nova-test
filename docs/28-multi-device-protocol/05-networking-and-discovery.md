# Networking, Discovery & Connection Lifecycle

## Networking

NOVA does not implement its own mesh networking — it integrates with a
user-configured mesh provider (Tailscale by default, per
`docs/20-devices/remote-control.md`), reached over:

| Path | When used |
|---|---|
| LAN | Both devices on the same local network; lowest latency, preferred when available |
| WAN via mesh (Tailscale/WireGuard) | Devices on different networks; the default off-LAN path |
| Relay | Neither direct LAN nor a direct mesh path is establishable (restrictive NAT on both ends); traffic relayed through the mesh provider's relay infrastructure, still end-to-end encrypted |
| Direct | A direct peer-to-peer connection negotiated by the mesh provider once a path is found, superseding relay once established |

Additional required properties: NAT traversal (delegated to the mesh
provider), automatic reconnect on link loss, periodic heartbeat to detect
silent failures, payload compression for constrained links, encryption
in transit (always, regardless of path — LAN traffic is not treated as
implicitly trusted), and bounded timeouts on every network operation
(same discipline as `docs/25-failure-modes/FM-11-006`, API timeout,
applied to inter-device calls specifically).

## Discovery

How devices find each other on a given network:

| Mechanism | Scope | Notes |
|---|---|---|
| mDNS | LAN | Fast local discovery when both devices are on the same network; used opportunistically to prefer the LAN path over WAN/mesh when both are available |
| QR code | Initial pairing only | See `02-device-pairing-protocol.md`; not used for ongoing discovery after pairing |
| Mesh provider's own discovery | WAN | Once paired, the mesh network (Tailscale) provides addressing/discovery for already-known peers without re-pairing |
| Relay/cloud rendezvous | Fallback | Only used to establish a path when direct discovery fails; never used to route ongoing traffic content itself, per the relay definition above |

Bluetooth discovery is intentionally **not** used for ongoing
device-to-device NOVA traffic (only for phone-local peripheral use per
`04-presence-and-capabilities.md`'s Bluetooth capability) — mesh-network
discovery is the single consistent mechanism once devices are paired, to
avoid maintaining parallel discovery implementations.

## Connection lifecycle

```
Disconnected
      ↓
Discovering
      ↓
Pairing            (only for a never-before-paired device — 02-device-pairing-protocol.md)
      ↓
Authenticating     (using the stored pairing key, for already-paired devices)
      ↓
Connected
      ↓
Healthy ⇄ Degraded
      ↓
Reconnecting
      ↓
Disconnected
```

`Healthy ⇄ Degraded` is a bidirectional edge: a connected session can
degrade (elevated latency/packet loss detected via heartbeat) and
recover without dropping to `Reconnecting` — `Reconnecting` is reserved
for an actual connection loss, not merely reduced quality, so a
momentarily lossy link doesn't trigger a full re-handshake unnecessarily.

## Related documents

- `docs/20-devices/remote-control.md` — the mesh-provider integration
  pattern this reuses
- `02-device-pairing-protocol.md` — the Pairing state in the lifecycle above
- `13-resource-arbitration-and-offline-mode.md` — what happens during
  extended `Disconnected` periods

## Where This Breaks

Failure modes specific to this protocol area. Cross-referenced from `docs/25-failure-modes/FM-26-multi-device-protocol.md`, which indexes all multi-device failure entries in one place, and from `FM-10-desktop-android-distributed-sync.md` for the general distributed-systems failure classes this protocol area instantiates.

| ID | Failure | Trigger | Detection | Severity | Mitigation | Recovery |
|---|---|---|---|---|---|---|
| **FM-26-014** | Connection oscillates between `Healthy` and `Degraded` rapidly ('flapping') | Borderline link quality sits right at the degradation threshold, triggering repeated state-change events. | State-transition frequency for a single connection exceeds a sane rate within a short window. | Low | Hysteresis on the Healthy/Degraded threshold (require sustained improvement/degradation over a window before flipping state, not a single sample). | Widen the hysteresis band for the specific flapping connection; suppress redundant state-change events below a minimum interval. |
| **FM-26-015** | Relay path is used even when a direct/LAN path is actually available, adding unnecessary latency | Path-selection logic doesn't re-evaluate for a better path once relay is established, per the 'direct supersedes relay once established' rule above not actually being implemented. | Latency metrics for a connection are consistently higher than expected given both devices' actual network conditions. | Low | Periodically re-attempt direct/LAN path establishment even after relay is working, and switch over transparently when a better path succeeds — never treat relay as a permanent fallback once accepted. | Trigger a path re-evaluation; no data loss risk since this is purely a performance issue, not a correctness one. |
| **FM-26-016** | mDNS discovery finds and connects to the wrong device due to a naming collision on a shared network | Two NOVA-paired devices with similar advertised names on a public/shared LAN (e.g. a coffee shop network) cause ambiguous discovery. | Discovery matches by advertised name alone rather than verifying against the stored pairing key. | Medium | Discovery is only a candidate-finding step — the actual connection must always authenticate against the stored pairing key from `02-device-pairing-protocol.md` before any traffic is trusted, regardless of how the candidate was discovered. | Reject the connection at the authentication step if the discovered device's key doesn't match the expected paired device; this should never actually result in incorrect data exchange if authentication is enforced correctly. |
