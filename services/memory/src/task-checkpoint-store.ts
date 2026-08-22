import { randomUUID } from "node:crypto";
import { err, ok, type ErrorInfo, type Result } from "@nova/shared";
import type { PrismaClient } from "./generated/index.js";

export type TaskCheckpointStatus = "Created" | "Valid" | "Superseded";
export type PersistedTaskState =
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
export type PersistedWaitingUserReason = "permission_confirmation" | "clarification_requested";

export interface PersistedTaskRecord {
  readonly task_id: string;
  readonly goal: string;
  readonly correlation_id: string;
  readonly state: PersistedTaskState;
  readonly retry_count: number;
  readonly step_history: readonly unknown[];
  readonly waiting_user_reason?: PersistedWaitingUserReason;
  readonly reason?: string;
  readonly updated_at: string;
}

export class TaskCheckpointStore {
  public constructor(
    private readonly client: PrismaClient,
    private readonly workspaceId: string,
  ) {}

  public async append(
    record: PersistedTaskRecord,
    status: TaskCheckpointStatus,
  ): Promise<Result<void>> {
    try {
      await this.client.$transaction(async (transaction) => {
        await transaction.taskCheckpoint.updateMany({
          where: {
            workspaceId: this.workspaceId,
            taskId: record.task_id,
            checkpointStatus: { in: ["Created", "Valid"] },
          },
          data: { checkpointStatus: "Superseded" },
        });
        await transaction.taskCheckpoint.create({
          data: {
            id: randomUUID(),
            workspaceId: this.workspaceId,
            taskId: record.task_id,
            checkpointStatus: status,
            state: record.state,
            goal: record.goal,
            correlationId: record.correlation_id,
            retryCount: record.retry_count,
            stepHistoryJson: JSON.stringify(record.step_history),
            ...(record.waiting_user_reason === undefined
              ? {}
              : { waitingUserReason: record.waiting_user_reason }),
            ...(record.reason === undefined ? {} : { reason: record.reason }),
            updatedAt: new Date(record.updated_at),
          },
        });
      });
      return ok(undefined);
    } catch (cause) {
      return err(this.storageError(cause));
    }
  }

  public async loadLatest(): Promise<Result<readonly PersistedTaskRecord[]>> {
    try {
      const rows = await this.client.taskCheckpoint.findMany({
        where: { workspaceId: this.workspaceId },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      });
      const latest = new Map<string, PersistedTaskRecord>();
      for (const row of rows) {
        if (row.checkpointStatus === "Superseded" || latest.has(row.taskId)) continue;
        const parsed = this.parseRow(row);
        if (!parsed.ok) return parsed;
        latest.set(row.taskId, parsed.value);
      }
      return ok([...latest.values()]);
    } catch (cause) {
      return err(this.storageError(cause));
    }
  }

  public async recoverAfterCrash(): Promise<Result<readonly PersistedTaskRecord[]>> {
    const loaded = await this.loadLatest();
    if (!loaded.ok) return loaded;

    const recovered: PersistedTaskRecord[] = [];
    for (const record of loaded.value) {
      const next: PersistedTaskRecord =
        record.state === "Executing" || record.state === "Verifying"
          ? { ...record, state: "Unverified", updated_at: new Date().toISOString() }
          : record;
      const persisted = next === record ? ok(undefined) : await this.append(next, "Valid");
      if (!persisted.ok) return persisted;
      recovered.push(next);
    }
    return ok(recovered);
  }

  private parseRow(row: {
    taskId: string;
    goal: string;
    correlationId: string;
    state: string;
    retryCount: number;
    stepHistoryJson: string;
    waitingUserReason: string | null;
    reason: string | null;
    updatedAt: Date;
  }): Result<PersistedTaskRecord> {
    try {
      const stepHistory = JSON.parse(row.stepHistoryJson) as unknown;
      if (!Array.isArray(stepHistory)) return err(this.corruptError());
      return ok({
        task_id: row.taskId,
        goal: row.goal,
        correlation_id: row.correlationId,
        state: row.state as PersistedTaskState,
        retry_count: row.retryCount,
        step_history: stepHistory,
        ...(row.waitingUserReason === null
          ? {}
          : { waiting_user_reason: row.waitingUserReason as PersistedWaitingUserReason }),
        ...(row.reason === null ? {} : { reason: row.reason }),
        updated_at: row.updatedAt.toISOString(),
      });
    } catch {
      return err(this.corruptError());
    }
  }

  private corruptError(): ErrorInfo {
    return {
      code: "NOVA-EVT002",
      message: "Task checkpoint data is malformed.",
      retryable: false,
    };
  }

  private storageError(cause: unknown): ErrorInfo {
    return {
      code: "NOVA-MEM001",
      message: cause instanceof Error ? cause.message : "Task checkpoint storage failed.",
      retryable: true,
    };
  }
}
