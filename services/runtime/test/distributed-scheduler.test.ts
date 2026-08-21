import { describe, expect, it } from "vitest";
import { DistributedTaskScheduler, type PeerSnapshot } from "../src/distributed-scheduler.js";

const peer = (device_id: string, overrides: Partial<PeerSnapshot> = {}): PeerSnapshot => ({
  device_id,
  role: "full-peer",
  reachable: true,
  degraded: false,
  resource_headroom: 0.8,
  capabilities: [],
  ...overrides,
});

describe("DistributedTaskScheduler", () => {
  it("keeps placement on the originating peer unless cross-peer assignment is enabled", () => {
    const scheduler = new DistributedTaskScheduler();
    const result = scheduler.assign({
      task_id: "task-1",
      origin_device_id: "laptop",
      state: "Executing",
      cross_peer_assignment_enabled: false,
      peers: [
        peer("laptop", { resource_headroom: 0.1 }),
        peer("desktop", { resource_headroom: 0.9 }),
      ],
    });

    expect(result).toMatchObject({ ok: true, value: { device_id: "laptop", reason: "origin" } });
  });

  it("selects the highest-scoring reachable Full Peer for a constrained origin", () => {
    const scheduler = new DistributedTaskScheduler({ minimumOriginHeadroom: 0.3 });
    const result = scheduler.assign({
      task_id: "task-2",
      origin_device_id: "laptop",
      state: "Executing",
      cross_peer_assignment_enabled: true,
      peers: [
        peer("laptop", { resource_headroom: 0.1 }),
        peer("desktop", { resource_headroom: 0.7 }),
        peer("workstation", { resource_headroom: 0.9, degraded: true }),
        peer("phone", { role: "companion", resource_headroom: 1 }),
      ],
    });

    expect(result).toMatchObject({ ok: true, value: { device_id: "desktop", reason: "resource" } });
  });

  it("routes a local-only capability to the paired peer that owns it", () => {
    const scheduler = new DistributedTaskScheduler();
    const result = scheduler.assign({
      task_id: "task-3",
      origin_device_id: "laptop",
      required_capability: "gpu.local-model",
      state: "Planning",
      cross_peer_assignment_enabled: true,
      peers: [
        peer("laptop", { capabilities: ["cpu.local-model"] }),
        peer("desktop", { resource_headroom: 0.2, capabilities: ["gpu.local-model"] }),
      ],
    });

    expect(result).toMatchObject({
      ok: true,
      value: { device_id: "desktop", reason: "capability" },
    });
  });

  it("never reassigns a task waiting for a user confirmation", () => {
    const scheduler = new DistributedTaskScheduler();
    const result = scheduler.assign({
      task_id: "task-4",
      origin_device_id: "laptop",
      state: "WaitingUser",
      cross_peer_assignment_enabled: true,
      peers: [
        peer("laptop", { resource_headroom: 0.05 }),
        peer("desktop", { resource_headroom: 0.99 }),
      ],
    });

    expect(result).toMatchObject({ ok: true, value: { device_id: "laptop", reason: "origin" } });
  });

  it("returns a network error when an offline origin has no eligible Full Peer fallback", () => {
    const scheduler = new DistributedTaskScheduler();
    const result = scheduler.assign({
      task_id: "task-5",
      origin_device_id: "laptop",
      state: "Failed",
      cross_peer_assignment_enabled: true,
      peers: [peer("laptop", { reachable: false }), peer("phone", { role: "companion" })],
    });

    expect(result).toMatchObject({ ok: false, error: { code: "NOVA-NET001" } });
  });
});
