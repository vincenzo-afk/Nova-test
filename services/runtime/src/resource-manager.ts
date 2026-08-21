import { ok, type Result } from "@nova/shared";

export interface LockGrant {
  readonly status: "granted" | "queued";
  readonly task_id: string;
  readonly resources: readonly string[];
}

interface HeldLock {
  readonly task_id: string;
  readonly acquired_at: number;
}

interface QueuedRequest {
  readonly task_id: string;
  readonly resources: readonly string[];
}

export class ResourceManager {
  private readonly held = new Map<string, HeldLock>();
  private readonly queued: QueuedRequest[] = [];
  private readonly maxLockDurationMs: number;
  private readonly now: () => number;

  constructor(options: { readonly maxLockDurationMs?: number; readonly now?: () => number } = {}) {
    this.maxLockDurationMs = options.maxLockDurationMs ?? 60_000;
    this.now = options.now ?? (() => Date.now());
  }

  acquire(taskId: string, resources: readonly string[]): Result<LockGrant> {
    const normalized = [...new Set(resources)].sort();
    if (normalized.length === 0) {
      return ok({ status: "granted", task_id: taskId, resources: [] });
    }
    if (
      normalized.some(
        (resource) => this.held.has(resource) && this.held.get(resource)?.task_id !== taskId,
      )
    ) {
      if (!this.queued.some((request) => request.task_id === taskId)) {
        this.queued.push({ task_id: taskId, resources: normalized });
      }
      return ok({ status: "queued", task_id: taskId, resources: normalized });
    }

    for (const resource of normalized) {
      this.held.set(resource, { task_id: taskId, acquired_at: this.now() });
    }
    return ok({ status: "granted", task_id: taskId, resources: normalized });
  }

  release(taskId: string): Result<readonly string[]> {
    for (const [resource, lock] of this.held.entries()) {
      if (lock.task_id === taskId) {
        this.held.delete(resource);
      }
    }

    const granted: string[] = [];
    for (let index = 0; index < this.queued.length;) {
      const request = this.queued[index];
      if (!request) {
        index += 1;
        continue;
      }
      if (request.resources.every((resource) => !this.held.has(resource))) {
        for (const resource of request.resources) {
          this.held.set(resource, { task_id: request.task_id, acquired_at: this.now() });
        }
        granted.push(request.task_id);
        this.queued.splice(index, 1);
      } else {
        index += 1;
      }
    }
    return ok(granted);
  }

  holder(resource: string): string | undefined {
    return this.held.get(resource)?.task_id;
  }

  expireLocks(): readonly string[] {
    const expired = new Set<string>();
    for (const [resource, lock] of this.held.entries()) {
      if (this.now() - lock.acquired_at >= this.maxLockDurationMs) {
        expired.add(lock.task_id);
        this.held.delete(resource);
      }
    }
    return [...expired];
  }
}
