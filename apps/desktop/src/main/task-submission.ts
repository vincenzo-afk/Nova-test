import type { RuntimeTaskCoordinator, TaskRecord, TaskScheduler } from "@nova/runtime";
import type { Result } from "@nova/shared";

interface DesktopTaskCoordinator {
  readonly submitDurable: RuntimeTaskCoordinator["submitDurable"];
}

interface DesktopTaskScheduler {
  readonly enqueue: TaskScheduler["enqueue"];
  readonly dispatch: TaskScheduler["dispatch"];
}

export async function submitDesktopTask(
  coordinator: DesktopTaskCoordinator,
  scheduler: DesktopTaskScheduler | undefined,
  goal: string,
): Promise<Result<TaskRecord>> {
  const result = await coordinator.submitDurable({ goal });
  if (!result.ok || scheduler === undefined) return result;
  scheduler.enqueue(result.value.task_id, "interactive");
  void scheduler.dispatch();
  return result;
}
