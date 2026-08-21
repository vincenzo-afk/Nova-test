import { describe, expect, it, vi } from "vitest";
import {
  NetworkDiscoveryManager,
  type NetworkPath,
  type NetworkTransport,
} from "../src/networking.js";

const transport = (path: NetworkPath, key: string): NetworkTransport => ({
  path,
  connect: vi.fn(async () => ({ peer_public_key: key })),
});

describe("NetworkDiscoveryManager", () => {
  it("prefers LAN, then direct mesh, then WAN, then relay", async () => {
    const manager = new NetworkDiscoveryManager({
      expectedPeerKey: "peer-key",
      transports: [
        transport("relay", "peer-key"),
        transport("wan", "peer-key"),
        transport("lan", "peer-key"),
        transport("direct", "peer-key"),
      ],
    });

    expect(await manager.connect()).toMatchObject({
      ok: true,
      value: { path: "lan", state: "Healthy" },
    });
  });

  it("authenticates discovered candidates against the stored pairing key", async () => {
    const wrong = transport("lan", "wrong-key");
    const right = transport("wan", "peer-key");
    const manager = new NetworkDiscoveryManager({
      expectedPeerKey: "peer-key",
      transports: [wrong, right],
    });

    expect(await manager.connect()).toMatchObject({
      ok: true,
      value: { path: "wan", state: "Healthy" },
    });
    expect(manager.state()).toBe("Healthy");
  });

  it("marks a connected link degraded on poor heartbeat and recovers after sustained health", async () => {
    const manager = new NetworkDiscoveryManager({
      expectedPeerKey: "peer-key",
      transports: [transport("lan", "peer-key")],
      degradationLatencyMs: 100,
    });
    await manager.connect();

    expect(manager.heartbeat({ latencyMs: 200, packetLoss: 0 })).toMatchObject({
      ok: true,
      value: { state: "Degraded" },
    });
    expect(manager.heartbeat({ latencyMs: 20, packetLoss: 0 })).toMatchObject({
      ok: true,
      value: { state: "Healthy" },
    });
  });
});
