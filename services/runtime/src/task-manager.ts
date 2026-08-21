import { randomUUID } from "node:crypto";
import { err, ok, type ErrorInfo, type Result } from "@nova/shared";

export type TaskState =
  | "Created"
  | "Planning"
  | "WaitingResources"
  | "Executing"
  | "Verifying"
  | "Completed"
  | "Unverified"
  | "Failed"
  | "Retrying"
  | "Paused"
  | "WaitingUser"
  | "Cancelled";
export type WaitingUserReason = "permission_confirmation" | "clarification_requested";

export interface TaskRecord {
  readonly task_id: string;
  readonly goal: string;
  readonly correlation_id: string;
  readonly state: TaskState;
  readonly retry_count: number;
  readonly step_history: readonly unknown[];
  readonly waiting_user_reason?: WaitingUserReason;
  readonly reason?: string;
  readonly updated_at: string;
}

const transitions: Readonly<Record<TaskState, readonly TaskState[]>> = {
  Created: ["Planning", "Paused", "Cancelled"],
  Planning: ["WaitingResources", "Executing", "Paused", "WaitingUser", "Failed", "Cancelled"],
  WaitingResources: ["Executing", "Paused", "Cancelled"],
  Executing: ["Verifying", "Failed", "Paused", "Cancelled"],
  Verifying: ["Completed", "Unverified", "Failed"],
  Completed: [],
  Unverified: ["Retrying"],
  Failed: ["Retrying"],
  Retrying: ["Planning"],
  Paused: ["WaitingUser", "Planning", "Executing"],
  WaitingUser: ["Planning", "Executing", "Cancelled"],
  Cancelled: [],
};

export class TaskManager {
  private readonly tasks = new Map<string, TaskRecord>();
  private readonly maxRetries: number;

  constructor(options: { readonly maxRetries?: number } = {}) {
    this.maxRetries = options.maxRetries ?? 3;
  }

  create(input: {
    readonly task_id?: string;
    readonly goal: string;
    readonly correlation_id?: string;
  }): Result<TaskRecord> {
    const taskId = input.task_id ?? randomUUID();
    if (this.tasks.has(taskId)) {
      return err({
        code: "NOVA-TL004",
        message: "Task already exists.",
        retryable: false,
        details: { taskId },
      });
    }
    const record: TaskRecord = {
      task_id: taskId,
      goal: input.goal,
      correlation_id: input.correlation_id ?? randomUUID(),
      state: "Created",
      retry_count: 0,
      step_history: [],
      updated_at: new Date().toISOString(),
    };
    this.tasks.set(taskId, record);
    return ok(record);
  }

  get(taskId: string): Result<TaskRecord> {
    const task = this.tasks.get(taskId);
    return task ? ok(task) : err(this.notFound(taskId));
  }

  transition(
    taskId: string,
    target: TaskState,
    reason?: WaitingUserReason | "resumed",
  ): Result<TaskRecord> {
    const current = this.tasks.get(taskId);
    if (!current) {
      return err(this.notFound(taskId));
    }
    if (!transitions[current.state].includes(target)) {
      return err({
        code: "NOVA-TL002",
        message: `Illegal task transition: ${current.state} -> ${target}.`,
        retryable: false,
        details: { taskId, from: current.state, to: target },
      });
    }
    if (
      target === "WaitingUser" &&
      reason !== "permission_confirmation" &&
      reason !== "clarification_requested"
    ) {
      return err({
        code: "NOVA-TL002",
        message: "WaitingUser requires an explicit blocking reason.",
        retryable: false,
      });
    }
    if (target === "Retrying" && current.retry_count >= this.maxRetries) {
      return err({
        code: "NOVA-TL002",
        message: "Task retry budget is exhausted.",
        retryable: false,
        details: { taskId, maxRetries: this.maxRetries },
      });
    }

    const next: TaskRecord = {
      task_id: current.task_id,
      goal: current.goal,
      correlation_id: current.correlation_id,
      state: target,
      retry_count: target === "Retrying" ? current.retry_count + 1 : current.retry_count,
      step_history: current.step_history,
      updated_at: new Date().toISOString(),
      ...(target === "WaitingUser" ? { waiting_user_reason: reason as WaitingUserReason } : {}),
      ...(target === "Cancelled" || target === "Failed" ? { reason: String(reason ?? "") } : {}),
    };
    this.tasks.set(taskId, next);
    return ok(next);
  }

  appendStepHistory(taskId: string, step: unknown): Result<TaskRecord> {
    const current = this.tasks.get(taskId);
    if (!current) {
      return err(this.notFound(taskId));
    }
    const next: TaskRecord = {
      ...current,
      step_history: [...current.step_history, step],
      updated_at: new Date().toISOString(),
    };
    this.tasks.set(taskId, next);
    return ok(next);
  }

  private notFound(taskId: string): ErrorInfo {
    return {
      code: "NOVA-TL004",
      message: "Task does not exist.",
      retryable: false,
      details: { taskId },
    };
  }
}
