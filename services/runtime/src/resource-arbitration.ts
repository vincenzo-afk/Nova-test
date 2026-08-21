import { err, ok, type ErrorInfo, type Result } from "@nova/shared";

export interface ResourceRequest {
  readonly request_id: string;
  readonly origin: "local" | "remote";
  readonly explicit_remote_override?: boolean;
}

export interface ResourceDecision {
  readonly status: "Granted" | "Queued";
  readonly request_id?: string;
}

interface HeldResource {
  readonly request: ResourceRequest;
}

export class ResourceArbitrator {
  private readonly held = new Map<string, HeldResource>();
  private readonly queues = new Map<string, ResourceRequest[]>();

  public acquire(resource: string, request: ResourceRequest): Result<ResourceDecision> {
    const current = this.held.get(resource);
    if (!current) {
      this.held.set(resource, { request });
      return ok({ status: "Granted", request_id: request.request_id });
    }
    if (request.origin === "remote" && request.explicit_remote_override === true) {
      this.held.set(resource, { request });
      return ok({ status: "Granted", request_id: request.request_id });
    }
    const queue = this.queues.get(resource) ?? [];
    queue.push(request);
    this.queues.set(resource, queue);
    return ok({ status: "Queued", request_id: request.request_id });
  }

  public release(resource: string, requestId: string): Result<{ granted_request_id?: string }> {
    const current = this.held.get(resource);
    if (!current || current.request.request_id !== requestId)
      return err(this.error("Resource is not held by the requesting session."));
    const queue = this.queues.get(resource) ?? [];
    const next = queue.shift();
    if (next) {
      this.held.set(resource, { request: next });
      this.queues.set(resource, queue);
      return ok({ granted_request_id: next.request_id });
    }
    this.held.delete(resource);
    this.queues.delete(resource);
    return ok({});
  }

  private error(message: string): ErrorInfo {
    return { code: "NOVA-EVT001", message, retryable: true };
  }
}

export interface OfflineAction {
  readonly action_id: string;
  readonly description: string;
}

export interface OfflineActionResult {
  readonly action_id: string;
  readonly status: "completed" | "failed";
}

export class OfflineActionQueue {
  private online = true;
  private readonly pending: OfflineAction[] = [];

  public constructor(
    private readonly execute: (action: OfflineAction) => Promise<OfflineActionResult>,
  ) {}

  public setOnline(online: boolean): void {
    this.online = online;
  }

  public async submit(
    action: OfflineAction,
  ): Promise<Result<{ status: "QueuedOffline" } | OfflineActionResult>> {
    if (!this.online) {
      this.pending.push(action);
      return ok({ status: "QueuedOffline" });
    }
    try {
      return ok(await this.execute(action));
    } catch {
      return err({
        code: "NOVA-EVT001",
        message: "Offline action execution failed.",
        retryable: true,
      });
    }
  }

  public async reconnect(): Promise<Result<readonly OfflineActionResult[]>> {
    this.online = true;
    const queued = this.pending.splice(0);
    const results: OfflineActionResult[] = [];
    try {
      for (const action of queued) results.push(await this.execute(action));
      return ok(results);
    } catch {
      return err({
        code: "NOVA-EVT001",
        message: "Queued offline action retry failed.",
        retryable: true,
      });
    }
  }
}
