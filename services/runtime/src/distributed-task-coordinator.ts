import type { Result } from "@nova/shared";
import { DistributedTaskScheduler } from "./distributed-scheduler.js";
import type { PeerSnapshot, TaskAssignment } from "./distributed-scheduler.js";
import type { TaskManager, TaskRecord } from "./task-manager.js";

export interface DistributedPlacementInput {
  readonly task_id: string;
  readonly origin_device_id: string;
  readonly required_capability?: string;
  readonly cross_peer_assignment_enabled: boolean;
  readonly peers: readonly PeerSnapshot[];
}

export interface DistributedPlacementResult {
  readonly task: TaskRecord;
  readonly assignment: TaskAssignment;
}

export class DistributedTaskCoordinator {
  public constructor(
    private readonly tasks: TaskManager,
    private readonly scheduler = new DistributedTaskScheduler(),
  ) {}

  public place(input: DistributedPlacementInput): Result<DistributedPlacementResult> {
    const task = this.tasks.get(input.task_id);
    if (!task.ok) return task;
    const assignment = this.scheduler.assign({
      task_id: input.task_id,
      origin_device_id: input.origin_device_id,
      ...(input.required_capability === undefined
        ? {}
        : { required_capability: input.required_capability }),
      state: task.value.state,
      cross_peer_assignment_enabled: input.cross_peer_assignment_enabled,
      peers: input.peers,
    });
    if (!assignment.ok) return assignment;
    const owner = this.tasks.assignOwner(input.task_id, assignment.value.device_id);
    if (!owner.ok) return owner;
    return { ok: true, value: { task: owner.value, assignment: assignment.value } };
  }
}
