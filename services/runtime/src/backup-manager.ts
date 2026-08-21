import { createHash } from "node:crypto";
import { err, ok, type ErrorInfo, type Result } from "@nova/shared";

export interface BackupBackend {
  write(snapshotId: string, contents: string): void;
  read(snapshotId: string): string | undefined;
  delete(snapshotId: string): void;
  list(): readonly string[];
}

export interface BackupOptions {
  readonly ownerId: string;
  readonly retentionCount?: number;
  readonly now?: () => number;
  readonly idFactory?: () => string;
  readonly encrypt: (plainText: string) => string;
  readonly decrypt: (cipherText: string) => string;
}

export interface SnapshotMetadata {
  readonly snapshot_id: string;
  readonly owner_id: string;
  readonly encrypted: true;
  readonly created_at: number;
  readonly reason: "scheduled" | "pre-update";
}

interface SnapshotEnvelope {
  readonly owner_id: string;
  readonly checksum: string;
  readonly payload: string;
}

export class BackupManager {
  private readonly metadata = new Map<string, SnapshotMetadata>();
  private readonly options: Required<Pick<BackupOptions, "ownerId" | "encrypt" | "decrypt">> &
    BackupOptions;

  public constructor(
    private readonly backend: BackupBackend,
    options: BackupOptions,
  ) {
    this.options = options;
  }

  public create<T>(state: T): Result<SnapshotMetadata> {
    return this.write(state, "scheduled");
  }

  public preUpdate<T>(state: T): Result<SnapshotMetadata> {
    return this.write(state, "pre-update");
  }

  public restore<T>(snapshotId: string): Result<T> {
    const encrypted = this.backend.read(snapshotId);
    if (!encrypted) return err(this.recoveryError("Backup snapshot is unavailable."));
    let envelope: SnapshotEnvelope;
    try {
      envelope = JSON.parse(this.options.decrypt(encrypted)) as SnapshotEnvelope;
      if (
        envelope.owner_id !== this.options.ownerId ||
        typeof envelope.payload !== "string" ||
        typeof envelope.checksum !== "string"
      ) {
        return err(this.securityError("Backup snapshot belongs to a different OS-user context."));
      }
      if (this.checksum(envelope.payload) !== envelope.checksum)
        return err(this.recoveryError("Backup snapshot integrity check failed."));
      return ok(JSON.parse(envelope.payload) as T);
    } catch {
      return err(this.recoveryError("Backup snapshot could not be decrypted or parsed."));
    }
  }

  private write<T>(state: T, reason: SnapshotMetadata["reason"]): Result<SnapshotMetadata> {
    const snapshotId = this.options.idFactory?.() ?? `snapshot-${this.now()}`;
    const payload = JSON.stringify(state);
    const envelope: SnapshotEnvelope = {
      owner_id: this.options.ownerId,
      checksum: this.checksum(payload),
      payload,
    };
    this.backend.write(snapshotId, this.options.encrypt(JSON.stringify(envelope)));
    const metadata: SnapshotMetadata = {
      snapshot_id: snapshotId,
      owner_id: this.options.ownerId,
      encrypted: true,
      created_at: this.now(),
      reason,
    };
    this.metadata.set(snapshotId, metadata);
    this.prune();
    return ok(metadata);
  }

  private prune(): void {
    const count = this.options.retentionCount ?? 7;
    const snapshots = [...this.metadata.values()].sort(
      (left, right) => right.created_at - left.created_at,
    );
    for (const stale of snapshots.slice(count)) {
      this.backend.delete(stale.snapshot_id);
      this.metadata.delete(stale.snapshot_id);
    }
  }

  private checksum(value: string): string {
    return createHash("sha256").update(value).digest("hex");
  }

  private now(): number {
    return this.options.now?.() ?? Date.now();
  }

  private securityError(message: string): ErrorInfo {
    return { code: "NOVA-SEC001", message, retryable: false };
  }

  private recoveryError(message: string): ErrorInfo {
    return { code: "NOVA-EVT002", message, retryable: false };
  }
}
