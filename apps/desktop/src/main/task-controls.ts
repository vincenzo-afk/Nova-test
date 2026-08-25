import { err, ok, type Result } from "@nova/shared";
import type { TaskManager, TaskRecord } from "@nova/runtime";

export interface DesktopTaskListPage {
  readonly items: readonly TaskRecord[];
  readonly next_cursor: string | null;
  readonly has_more: boolean;
}

export interface DesktopTaskListQuery {
  readonly limit?: number;
  readonly cursor?: string;
}

export interface DesktopTaskScheduler {
  cancel(taskId: string): boolean;
}

export function listDesktopTasks(
  tasks: readonly TaskRecord[],
  query: DesktopTaskListQuery,
): Result<DesktopTaskListPage> {
  const limit = normalizeLimit(query.limit);
  const offset = decodeTaskCursor(query.cursor);
  if (offset === undefined) {
    return err({
      code: "NOVA-TL003",
      message: "Task list cursor is invalid.",
      retryable: false,
    });
  }
  const items = tasks.slice(offset, offset + limit);
  const hasMore = offset + limit < tasks.length;
  return ok({
    items,
    next_cursor: hasMore ? encodeTaskCursor(offset + limit) : null,
    has_more: hasMore,
  });
}

export function pauseDesktopTask(
  tasks: TaskManager,
  scheduler: DesktopTaskScheduler | undefined,
  taskId: string,
  confirmed: boolean,
): Result<TaskRecord> {
  if (!confirmed) {
    return err({
      code: "NOVA-SEC001",
      message: "Pausing a task requires explicit confirmation.",
      retryable: false,
    });
  }
  const current = tasks.get(taskId);
  if (!current.ok) return current;
  if (current.value.state !== "Created") {
    return err({
      code: "NOVA-TL003",
      message: "Active task execution cannot be interrupted by the current scheduler.",
      retryable: false,
      details: { taskId, state: current.value.state },
    });
  }
  scheduler?.cancel(taskId);
  return tasks.transition(taskId, "Paused");
}

export function cancelDesktopTask(
  tasks: TaskManager,
  scheduler: DesktopTaskScheduler | undefined,
  taskId: string,
  confirmed: boolean,
): Result<TaskRecord> {
  if (!confirmed) {
    return err({
      code: "NOVA-SEC001",
      message: "Cancelling a task requires explicit confirmation.",
      retryable: false,
    });
  }
  const current = tasks.get(taskId);
  if (!current.ok) return current;
  if (current.value.state === "Cancelled") return current;
  scheduler?.cancel(taskId);
  if (!cancellableStates.has(current.value.state)) {
    return err({
      code: "NOVA-TL003",
      message: "Running task cancellation is not supported by the current executor.",
      retryable: false,
      details: { taskId, state: current.value.state },
    });
  }
  return tasks.transition(taskId, "Cancelled");
}

function normalizeLimit(limit: number | undefined): number {
  return limit !== undefined && Number.isInteger(limit) && limit > 0 ? Math.min(200, limit) : 50;
}

function encodeTaskCursor(offset: number): string {
  return Buffer.from(JSON.stringify({ offset }), "utf8").toString("base64url");
}

function decodeTaskCursor(cursor: string | undefined): number | undefined {
  if (cursor === undefined) return 0;
  try {
    const parsed: unknown = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    if (!parsed || typeof parsed !== "object") return undefined;
    const offset = (parsed as { readonly offset?: unknown }).offset;
    return typeof offset === "number" && Number.isInteger(offset) && offset >= 0
      ? offset
      : undefined;
  } catch {
    return undefined;
  }
}

const cancellableStates: ReadonlySet<TaskRecord["state"]> = new Set([
  "Created",
  "Planning",
  "WaitingResources",
  "Paused",
  "WaitingUser",
]);
