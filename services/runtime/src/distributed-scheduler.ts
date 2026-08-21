import { err, ok, type ErrorInfo, type Result } from "@nova/shared";
import type { TaskState } from "./task-manager.js";

export type PeerRole = "full-peer" | "companion";

export interface PeerSnapshot {
  readonly device_id: string;
  readonly role: PeerRole;
  readonly reachable: boolean;
  readonly degraded: boolean;
  readonly resource_headroom: number;
  readonly capabilities: readonly string[];
}

export interface TaskPlacementRequest {
  readonly task_id: string;
  readonly origin_device_id: string;
  readonly required_capability?: string;
  readonly state: TaskState;
  readonly cross_peer_assignment_enabled: boolean;
  readonly peers: readonly PeerSnapshot[];
}

export interface TaskAssignment {
  readonly task_id: string;
  readonly device_id: string;
  readonly reassigned: boolean;
  readonly reason: "origin" | "resource" | "capability";
}

export interface DistributedTaskSchedulerOptions {
  readonly minimumOriginHeadroom?: number;
}

export class DistributedTaskScheduler {
  private readonly minimumOriginHeadroom: number;

  public constructor(options: DistributedTaskSchedulerOptions = {}) {
    this.minimumOriginHeadroom = options.minimumOriginHeadroom ?? 0.25;
  }

  public assign(request: TaskPlacementRequest): Result<TaskAssignment> {
    const origin = request.peers.find((peer) => peer.device_id === request.origin_device_id);
    if (!origin) return err(this.networkError("Originating device is not paired."));

    const originAssignment: TaskAssignment = {
      task_id: request.task_id,
      device_id: origin.device_id,
      reassigned: false,
      reason: "origin",
    };
    if (!request.cross_peer_assignment_enabled || request.state === "WaitingUser")
      return ok(originAssignment);

    const capabilityGap =
      request.required_capability !== undefined &&
      !origin.capabilities.includes(request.required_capability);
    const resourceConstrained =
      !origin.reachable || origin.degraded || origin.resource_headroom < this.minimumOriginHeadroom;
    if (!capabilityGap && !resourceConstrained) return ok(originAssignment);

    const eligible = request.peers.filter((peer) => {
      if (peer.role !== "full-peer" || !peer.reachable || peer.degraded) return false;
      if (request.required_capability && !peer.capabilities.includes(request.required_capability))
        return false;
      return true;
    });
    const selected = [...eligible].sort((left, right) => {
      const scoreDifference = this.score(right, request) - this.score(left, request);
      return scoreDifference !== 0
        ? scoreDifference
        : left.device_id.localeCompare(right.device_id);
    })[0];
    if (!selected)
      return err(
        this.networkError("No reachable Full Peer satisfies the task placement requirements."),
      );

    return ok({
      task_id: request.task_id,
      device_id: selected.device_id,
      reassigned: selected.device_id !== origin.device_id,
      reason: capabilityGap ? "capability" : "resource",
    });
  }

  private score(peer: PeerSnapshot, request: TaskPlacementRequest): number {
    const capabilityBonus =
      request.required_capability && peer.capabilities.includes(request.required_capability)
        ? 1
        : 0;
    return peer.resource_headroom + capabilityBonus;
  }

  private networkError(message: string): ErrorInfo {
    return { code: "NOVA-NET001", message, retryable: true };
  }
}
