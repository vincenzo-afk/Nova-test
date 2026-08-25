import type { Result } from "@nova/shared";

export type ScheduledTaskPriority = "interactive" | "default" | "background";

export interface TaskExecutionDispatcher {
  execute(taskId: string): Promise<Result<unknown>>;
}

export interface TaskSchedulerOptions {
  readonly maxConcurrent: number;
  readonly starvationThresholdMs: number;
  readonly now?: () => number;
}

export interface TaskSchedulerStatus {
  readonly queued_count: number;
  readonly active_count: number;
  readonly max_concurrent: number;
}

interface QueueEntry {
  readonly taskId: string;
  readonly priority: ScheduledTaskPriority;
  readonly sequence: number;
  readonly enqueuedAt: number;
}

const priorityRank: Readonly<Record<ScheduledTaskPriority, number>> = {
  background: 0,
  default: 1,
  interactive: 2,
};

export class TaskScheduler {
  private readonly queue: QueueEntry[] = [];
  private readonly running = new Set<string>();
  private readonly now: () => number;
  private sequence = 0;
  private drainPromise: Promise<void> | undefined;
  private resolveDrain: (() => void) | undefined;

  public constructor(
    private readonly dispatcher: TaskExecutionDispatcher,
    private readonly options: TaskSchedulerOptions,
  ) {
    if (!Number.isInteger(options.maxConcurrent) || options.maxConcurrent < 1) {
      throw new Error("maxConcurrent must be a positive integer.");
    }
    if (!Number.isFinite(options.starvationThresholdMs) || options.starvationThresholdMs <= 0) {
      throw new Error("starvationThresholdMs must be positive.");
    }
    this.now = options.now ?? Date.now;
  }

  public enqueue(taskId: string, priority: ScheduledTaskPriority, enqueuedAt = this.now()): void {
    if (this.running.has(taskId) || this.queue.some((entry) => entry.taskId === taskId)) return;
    this.queue.push({ taskId, priority, sequence: this.sequence++, enqueuedAt });
  }

  public async dispatch(): Promise<void> {
    if (this.drainPromise) return this.drainPromise;
    this.drainPromise = new Promise<void>((resolve) => {
      this.resolveDrain = resolve;
    });
    this.fillSlots();
    if (this.queue.length === 0 && this.running.size === 0) this.finishDrain();
    return this.drainPromise;
  }

  public cancel(taskId: string): boolean {
    const index = this.queue.findIndex((entry) => entry.taskId === taskId);
    if (index < 0) return false;
    this.queue.splice(index, 1);
    if (this.queue.length === 0 && this.running.size === 0) this.finishDrain();
    return true;
  }

  public queuedCount(): number {
    return this.queue.length;
  }

  public activeCount(): number {
    return this.running.size;
  }

  public status(): TaskSchedulerStatus {
    return {
      queued_count: this.queue.length,
      active_count: this.running.size,
      max_concurrent: this.options.maxConcurrent,
    };
  }

  private fillSlots(): void {
    while (this.running.size < this.options.maxConcurrent && this.queue.length > 0) {
      const index = this.nextIndex();
      const entry = this.queue[index];
      if (!entry) break;
      this.queue.splice(index, 1);
      this.running.add(entry.taskId);
      void this.run(entry.taskId);
    }
  }

  private async run(taskId: string): Promise<void> {
    try {
      await this.dispatcher.execute(taskId);
    } finally {
      this.running.delete(taskId);
      this.fillSlots();
      if (this.queue.length === 0 && this.running.size === 0) this.finishDrain();
    }
  }

  private nextIndex(): number {
    const now = this.now();
    let bestIndex = 0;
    let bestScore = Number.NEGATIVE_INFINITY;
    for (let index = 0; index < this.queue.length; index += 1) {
      const entry = this.queue[index];
      if (!entry) continue;
      const ageBoost = Math.floor(
        Math.max(0, now - entry.enqueuedAt) / this.options.starvationThresholdMs,
      );
      const score = priorityRank[entry.priority] + ageBoost;
      const bestEntry = this.queue[bestIndex];
      if (
        score > bestScore ||
        (score === bestScore && bestEntry !== undefined && entry.sequence < bestEntry.sequence)
      ) {
        bestIndex = index;
        bestScore = score;
      }
    }
    return bestIndex;
  }

  private finishDrain(): void {
    const resolve = this.resolveDrain;
    this.drainPromise = undefined;
    this.resolveDrain = undefined;
    resolve?.();
  }
}
