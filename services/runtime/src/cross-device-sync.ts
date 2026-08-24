import type { StructuredLogger } from "@nova/shared";

import { err, ok, type ErrorInfo, type Result } from "@nova/shared";

export type SyncCategory =
  "security" | "task_state" | "episodic_memory" | "knowledge_graph" | "configuration";

export interface SyncChange {
  readonly change_id: string;
  readonly entity_id: string;
  readonly category: SyncCategory;
  readonly logical_clock: number;
  readonly partition: string;
  readonly fields: Readonly<Record<string, unknown>>;
}

export interface SyncTransport {
  readonly pull: (
    sinceLogicalClock: number,
  ) => Promise<{ next_clock: number; envelopes: readonly string[] }>;
  readonly push?: (envelopes: readonly string[]) => Promise<void>;
  readonly encrypt: (payload: string) => string;
  readonly decrypt: (payload: string) => string;
}

export interface SyncOptions {
  readonly granted_partitions: ReadonlySet<string>;
  readonly logger?: StructuredLogger;
}

export interface SyncResult {
  readonly checkpoint: number;
  readonly applied_change_ids: readonly string[];
}

export interface FlushResult {
  readonly pushed_change_ids: readonly string[];
}

interface LocalRecord {
  fields: Record<string, unknown>;
  fieldClocks: Record<string, number>;
  history: SyncChange[];
}

const priority: Record<SyncCategory, number> = {
  security: 0,
  task_state: 1,
  episodic_memory: 2,
  knowledge_graph: 3,
  configuration: 4,
};

export class CrossDeviceSyncManager {
  private checkpoint = 0;
  private readonly records = new Map<string, LocalRecord>();
  private readonly pending = new Map<string, SyncChange>();
  private readonly applied = new Set<string>();
  private readonly appliedOrder: string[] = [];

  public constructor(
    private readonly transport: SyncTransport,
    private readonly options: SyncOptions,
  ) {}

  public async sync(): Promise<Result<SyncResult>> {
    let pulled: { next_clock: number; envelopes: readonly string[] };
    try {
      pulled = await this.transport.pull(this.checkpoint);
    } catch {
      this.options.logger?.warning("sync.pull.failed", { reason: "transport_unavailable" });
      return err(this.eventError("Sync pull failed; local replica remains available."));
    }
    if (
      !Number.isSafeInteger(pulled.next_clock) ||
      pulled.next_clock < this.checkpoint ||
      pulled.next_clock < 0
    ) {
      this.options.logger?.warning("sync.pull.rejected", { reason: "invalid_checkpoint" });
      return err(this.eventError("Sync pull returned an invalid logical checkpoint."));
    }
    const changes: SyncChange[] = [];
    for (const envelope of pulled.envelopes) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(this.transport.decrypt(envelope));
      } catch {
        this.options.logger?.warning("sync.pull.rejected", { reason: "decrypt_or_parse_failed" });
        return err(this.eventError("Sync envelope could not be decrypted or parsed."));
      }
      if (!this.isChange(parsed)) {
        this.options.logger?.warning("sync.pull.rejected", { reason: "schema_invalid" });
        return err(this.eventError("Sync envelope failed schema validation."));
      }
      if (this.options.granted_partitions.has(parsed.partition)) changes.push(parsed);
    }
    changes.sort(
      (left, right) =>
        priority[left.category] - priority[right.category] ||
        left.logical_clock - right.logical_clock,
    );
    const filteredCount = pulled.envelopes.length - changes.length;
    this.options.logger?.info("sync.pull.completed", {
      checkpoint: pulled.next_clock,
      envelope_count: pulled.envelopes.length,
      filtered_count: filteredCount,
    });
    const appliedChangeIds: string[] = [];
    let duplicateCount = 0;
    for (const change of changes) {
      if (this.applied.has(change.change_id)) {
        duplicateCount += 1;
        continue;
      }
      this.apply(change);
      this.applied.add(change.change_id);
      this.appliedOrder.push(change.change_id);
      appliedChangeIds.push(change.change_id);
    }
    this.checkpoint = pulled.next_clock;
    this.options.logger?.info("sync.changes.applied", {
      checkpoint: this.checkpoint,
      applied_count: appliedChangeIds.length,
      duplicate_count: duplicateCount,
      filtered_count: filteredCount,
    });
    return ok({ checkpoint: this.checkpoint, applied_change_ids: appliedChangeIds });
  }

  public applyLocal(change: SyncChange): void {
    this.apply(change);
    this.pending.set(change.change_id, change);
    this.options.logger?.info("sync.local.change.queued", {
      category: change.category,
      partition: change.partition,
      queued_count: this.pending.size,
    });
  }

  public async flush(): Promise<Result<FlushResult>> {
    const changes = [...this.pending.values()];
    if (changes.length === 0) {
      this.options.logger?.info("sync.flush.skipped", { queued_count: 0 });
      return ok({ pushed_change_ids: [] });
    }
    if (!this.transport.push) {
      this.options.logger?.warning("sync.flush.rejected", {
        reason: "push_unsupported",
        queued_count: changes.length,
      });
      return err(this.eventError("Sync transport does not support pushing local changes."));
    }
    const envelopes = changes.map((change) => this.transport.encrypt(JSON.stringify(change)));
    try {
      await this.transport.push(envelopes);
    } catch {
      this.options.logger?.warning("sync.flush.failed", {
        reason: "transport_unavailable",
        queued_count: changes.length,
      });
      return err(this.eventError("Sync push failed; local changes remain queued."));
    }
    for (const change of changes) this.pending.delete(change.change_id);
    this.options.logger?.info("sync.flush.completed", {
      pushed_count: changes.length,
      queued_count: this.pending.size,
    });
    return ok({ pushed_change_ids: changes.map((change) => change.change_id) });
  }

  public record(
    entityId: string,
  ):
    | Readonly<{ fields: Readonly<Record<string, unknown>>; history: readonly SyncChange[] }>
    | undefined {
    const record = this.records.get(entityId);
    return record ? { fields: { ...record.fields }, history: [...record.history] } : undefined;
  }

  public history(entityId: string): readonly SyncChange[] {
    return this.records.get(entityId)?.history ?? [];
  }

  public appliedChangeIds(): readonly string[] {
    return [...this.appliedOrder];
  }

  public checkpointValue(): number {
    return this.checkpoint;
  }

  private apply(change: SyncChange): void {
    const current = this.records.get(change.entity_id) ?? {
      fields: {},
      fieldClocks: {},
      history: [],
    };
    current.history.push(change);
    for (const [field, value] of Object.entries(change.fields)) {
      const currentClock = current.fieldClocks[field] ?? -1;
      if (change.logical_clock >= currentClock) {
        current.fields[field] = value;
        current.fieldClocks[field] = change.logical_clock;
      }
    }
    this.records.set(change.entity_id, current);
  }

  private isChange(value: unknown): value is SyncChange {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
    const candidate = value as Record<string, unknown>;
    return (
      typeof candidate.change_id === "string" &&
      typeof candidate.entity_id === "string" &&
      typeof candidate.category === "string" &&
      candidate.category in priority &&
      typeof candidate.logical_clock === "number" &&
      Number.isSafeInteger(candidate.logical_clock) &&
      candidate.logical_clock >= 0 &&
      typeof candidate.partition === "string" &&
      typeof candidate.fields === "object" &&
      candidate.fields !== null &&
      !Array.isArray(candidate.fields)
    );
  }

  private eventError(message: string): ErrorInfo {
    return { code: "NOVA-EVT001", message, retryable: true };
  }
}
