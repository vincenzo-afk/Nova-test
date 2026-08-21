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
      return err(this.eventError("Sync pull failed; local replica remains available."));
    }
    const changes: SyncChange[] = [];
    for (const envelope of pulled.envelopes) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(this.transport.decrypt(envelope));
      } catch {
        return err(this.eventError("Sync envelope could not be decrypted or parsed."));
      }
      if (!this.isChange(parsed))
        return err(this.eventError("Sync envelope failed schema validation."));
      if (this.options.granted_partitions.has(parsed.partition)) changes.push(parsed);
    }
    changes.sort(
      (left, right) =>
        priority[left.category] - priority[right.category] ||
        left.logical_clock - right.logical_clock,
    );
    const appliedChangeIds: string[] = [];
    for (const change of changes) {
      if (this.applied.has(change.change_id)) continue;
      this.apply(change);
      this.applied.add(change.change_id);
      this.appliedOrder.push(change.change_id);
      appliedChangeIds.push(change.change_id);
    }
    this.checkpoint = Math.max(this.checkpoint, pulled.next_clock);
    return ok({ checkpoint: this.checkpoint, applied_change_ids: appliedChangeIds });
  }

  public applyLocal(change: SyncChange): void {
    this.apply(change);
    this.pending.set(change.change_id, change);
  }

  public async flush(): Promise<Result<FlushResult>> {
    const changes = [...this.pending.values()];
    if (changes.length === 0) return ok({ pushed_change_ids: [] });
    if (!this.transport.push)
      return err(this.eventError("Sync transport does not support pushing local changes."));
    const envelopes = changes.map((change) => this.transport.encrypt(JSON.stringify(change)));
    try {
      await this.transport.push(envelopes);
    } catch {
      return err(this.eventError("Sync push failed; local changes remain queued."));
    }
    for (const change of changes) this.pending.delete(change.change_id);
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
