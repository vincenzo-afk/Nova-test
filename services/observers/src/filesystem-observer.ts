import { createHash, randomUUID } from "node:crypto";
import { realpath } from "node:fs/promises";
import { basename, dirname, extname, isAbsolute, join, relative, resolve } from "node:path";
import {
  createMessage,
  err,
  ok,
  type CommunicationBus,
  type ErrorInfo,
  type MessageEnvelope,
  type Result,
} from "@nova/shared";

export type FilesystemEventType = "created" | "modified" | "deleted" | "moved" | "renamed";
export type FilesystemObserverState = "Disabled" | "Enabling" | "Active" | "Degraded" | "Failed";

export interface RawFilesystemEvent {
  readonly type: FilesystemEventType;
  readonly path: string;
  readonly sizeBytes: number;
  readonly content?: string;
  readonly oldPath?: string;
  readonly correlationId?: string;
}

export interface FilesystemObserverOptions {
  readonly grantedScopes: readonly string[];
  readonly hashThresholdBytes: number;
  readonly bus: CommunicationBus;
  readonly now?: () => string;
}

const topicByType: Readonly<Record<FilesystemEventType, string>> = {
  created: "observer.filesystem.file_created",
  modified: "observer.filesystem.file_modified",
  deleted: "observer.filesystem.file_deleted",
  moved: "observer.filesystem.file_moved",
  renamed: "observer.filesystem.file_renamed",
};

export class FilesystemObserver {
  private currentState: FilesystemObserverState = "Disabled";
  private readonly scopes: string[];
  private readonly pending = new Map<string, MessageEnvelope>();
  private readonly now: () => string;

  constructor(private readonly options: FilesystemObserverOptions) {
    this.scopes = options.grantedScopes.map((scope) => resolve(scope));
    this.now = options.now ?? (() => new Date().toISOString());
  }

  state(): FilesystemObserverState {
    return this.currentState;
  }

  enable(): Result<FilesystemObserverState> {
    if (this.currentState !== "Disabled") {
      return err(this.transitionError(this.currentState, "Enabling"));
    }
    this.currentState = "Enabling";
    this.currentState = "Active";
    return ok(this.currentState);
  }

  degrade(): Result<FilesystemObserverState> {
    if (this.currentState !== "Active") {
      return err(this.transitionError(this.currentState, "Degraded"));
    }
    this.currentState = "Degraded";
    return ok(this.currentState);
  }

  recover(): Result<FilesystemObserverState> {
    if (this.currentState !== "Degraded") {
      return err(this.transitionError(this.currentState, "Active"));
    }
    this.currentState = "Active";
    return ok(this.currentState);
  }

  fail(): Result<FilesystemObserverState> {
    if (this.currentState !== "Active") {
      return err(this.transitionError(this.currentState, "Failed"));
    }
    this.currentState = "Failed";
    return ok(this.currentState);
  }

  revoke(): Result<FilesystemObserverState> {
    if (
      this.currentState !== "Active" &&
      this.currentState !== "Degraded" &&
      this.currentState !== "Failed"
    ) {
      return err(this.transitionError(this.currentState, "Disabled"));
    }
    this.pending.clear();
    this.currentState = "Disabled";
    return ok(this.currentState);
  }

  async capture(event: RawFilesystemEvent): Promise<Result<void>> {
    if (this.currentState !== "Active") {
      return err(this.permissionError("Filesystem observation is not active."));
    }
    if (!Number.isFinite(event.sizeBytes) || event.sizeBytes < 0) {
      return err(this.permissionError("Filesystem event size is invalid."));
    }

    const observedPath = this.normalizePath(event.path);
    const targetPath = await this.canonicalize(event.path);
    if (!(await this.isWithinGrantedScope(targetPath)) || this.isHiddenPath(observedPath)) {
      return err(
        this.permissionError("Filesystem event is outside the granted observation scope."),
      );
    }

    const payload: Record<string, string | number> = {
      entity_ref: observedPath,
      file_type: extname(observedPath),
      size_bytes: event.sizeBytes,
    };
    if (event.oldPath) {
      const oldPath = this.normalizePath(event.oldPath);
      const oldTargetPath = await this.canonicalize(event.oldPath);
      if (!(await this.isWithinGrantedScope(oldTargetPath)) || this.isHiddenPath(oldPath)) {
        return err(
          this.permissionError("Filesystem event is outside the granted observation scope."),
        );
      }
      payload.old_path = oldPath;
    }
    if (event.content !== undefined && event.sizeBytes <= this.options.hashThresholdBytes) {
      payload.content_hash = createHash("sha256").update(event.content).digest("hex");
    }

    const message = {
      ...createMessage({
        topic: topicByType[event.type],
        schema_version: "1.0.0",
        correlation_id: event.correlationId ?? randomUUID(),
        source_service: "observer.filesystem",
        payload,
      }),
      timestamp: this.now(),
    };
    this.pending.set(`${observedPath}:${event.type}`, message);
    return ok(undefined);
  }

  async flush(): Promise<Result<void>> {
    if (this.currentState !== "Active") {
      this.pending.clear();
      return ok(undefined);
    }
    const messages = [...this.pending.values()];
    this.pending.clear();
    if (messages.length === 0) {
      return ok(undefined);
    }

    if (messages.length > 50) {
      const bulkMessage = createMessage({
        topic: "observer.filesystem.bulk_change",
        schema_version: "1.0.0",
        correlation_id: randomUUID(),
        source_service: "observer.filesystem",
        payload: { events: messages.map((message) => message.payload) },
      });
      return this.options.bus.publish(bulkMessage);
    }

    for (const message of messages) {
      const result = await this.options.bus.publish(message);
      if (!result.ok) {
        return result;
      }
    }
    return ok(undefined);
  }

  private normalizePath(path: string): string {
    return resolve(path);
  }

  private async canonicalize(path: string): Promise<string> {
    const absolute = isAbsolute(path) ? path : resolve(path);
    try {
      return await realpath(absolute);
    } catch {
      return join(await realpath(dirname(absolute)), basename(absolute));
    }
  }

  private async isWithinGrantedScope(path: string): Promise<boolean> {
    for (const scope of this.scopes) {
      const canonicalScope = await this.canonicalize(scope);
      const relativePath = relative(canonicalScope, path);
      if (relativePath === "" || (!relativePath.startsWith("..") && !isAbsolute(relativePath))) {
        return true;
      }
    }
    return false;
  }

  private isHiddenPath(path: string): boolean {
    return path.split(/[\\\\/]/).some((segment) => segment.startsWith(".") && segment.length > 1);
  }

  private permissionError(message: string): ErrorInfo {
    return { code: "NOVA-TL005", message, retryable: false };
  }

  private transitionError(from: FilesystemObserverState, to: FilesystemObserverState): ErrorInfo {
    return {
      code: "NOVA-EVT001",
      message: `Illegal observer transition: ${from} -> ${to}.`,
      retryable: false,
      details: { from, to },
    };
  }
}
