import { describe, expect, it } from "vitest";
import { DistributedTaskCoordinator } from "../src/distributed-task-coordinator.js";
import { TaskManager } from "../src/task-manager.js";

const peers = [
  {
    device_id: "laptop",
    role: "full-peer" as const,
    reachable: true,
    degraded: false,
    resource_headroom: 0.1,
    capabilities: ["local.gpu"],
  },
  {
    device_id: "desktop",
    role: "full-peer" as const,
    reachable: true,
    degraded: false,
    resource_headroom: 0.8,
    capabilities: ["local.gpu"],
  },
];

describe("DistributedTaskCoordinator", () => {
  it("keeps the originating peer as owner when cross-peer assignment is disabled", () => {
    const tasks = new TaskManager();
    const created = tasks.create({
      task_id: "task-origin",
      goal: "summarize",
      owner_device_id: "laptop",
    });
    expect(created.ok).toBe(true);
    const coordinator = new DistributedTaskCoordinator(tasks);

    const result = coordinator.place({
      task_id: "task-origin",
      origin_device_id: "laptop",
      cross_peer_assignment_enabled: false,
      peers,
    });

    expect(result).toMatchObject({
      ok: true,
      value: {
        assignment: { device_id: "laptop", reassigned: false },
        task: { owner_device_id: "laptop" },
      },
    });
  });

  it("reassigns a constrained task to one eligible Full Peer and updates ownership", () => {
    const tasks = new TaskManager();
    expect(
      tasks.create({ task_id: "task-resource", goal: "build", owner_device_id: "laptop" }).ok,
    ).toBe(true);
    const coordinator = new DistributedTaskCoordinator(tasks);

    const result = coordinator.place({
      task_id: "task-resource",
      origin_device_id: "laptop",
      required_capability: "local.gpu",
      cross_peer_assignment_enabled: true,
      peers,
    });

    expect(result).toMatchObject({
      ok: true,
      value: {
        assignment: { device_id: "desktop", reassigned: true, reason: "resource" },
        task: { owner_device_id: "desktop" },
      },
    });
  });

  it("never silently moves a task waiting for user confirmation", () => {
    const tasks = new TaskManager();
    expect(
      tasks.create({ task_id: "task-waiting", goal: "delete", owner_device_id: "laptop" }).ok,
    ).toBe(true);
    expect(tasks.transition("task-waiting", "Planning").ok).toBe(true);
    expect(tasks.transition("task-waiting", "WaitingUser", "permission_confirmation").ok).toBe(
      true,
    );
    const coordinator = new DistributedTaskCoordinator(tasks);

    const result = coordinator.place({
      task_id: "task-waiting",
      origin_device_id: "laptop",
      cross_peer_assignment_enabled: true,
      peers,
    });

    expect(result).toMatchObject({
      ok: true,
      value: { assignment: { device_id: "laptop", reassigned: false } },
    });
  });

  it("re-scores peers on retry rather than pinning the previous owner", () => {
    const tasks = new TaskManager();
    expect(
      tasks.create({ task_id: "task-retry", goal: "deploy", owner_device_id: "laptop" }).ok,
    ).toBe(true);
    const coordinator = new DistributedTaskCoordinator(tasks);
    expect(
      coordinator.place({
        task_id: "task-retry",
        origin_device_id: "laptop",
        cross_peer_assignment_enabled: true,
        peers,
      }).value?.assignment.device_id,
    ).toBe("desktop");

    const retryPeers = peers.map((peer) =>
      peer.device_id === "desktop"
        ? { ...peer, reachable: false }
        : { ...peer, resource_headroom: 0.9 },
    );
    const result = coordinator.place({
      task_id: "task-retry",
      origin_device_id: "desktop",
      cross_peer_assignment_enabled: true,
      peers: retryPeers,
    });

    expect(result).toMatchObject({
      ok: true,
      value: { assignment: { device_id: "laptop", reassigned: true } },
    });
  });
});
