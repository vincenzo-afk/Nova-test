import { err, ok, type ErrorInfo, type Result } from "@nova/shared";
import type { McpProgressNotification } from "./mcp-progress-notification.js";
import { McpProgressNotificationClassifier } from "./mcp-progress-notification.js";

export interface McpProgressSnapshot {
  readonly server_id: string;
  readonly progressToken: string | number;
  readonly progress: number;
  readonly total?: number;
  readonly message?: string;
}

export interface McpProgressStateMiss {
  readonly server_id: string;
  readonly progressToken: string | number;
  readonly status: "miss";
}

type ProgressLookup = McpProgressSnapshot | McpProgressStateMiss;

const MAX_ENTRIES = 128;
const SERVER_ID_PATTERN = /^[A-Za-z0-9_.-]{1,128}$/;

export class McpProgressState {
  private readonly entries = new Map<string, McpProgressSnapshot>();
  private readonly classifier = new McpProgressNotificationClassifier();

  public apply(serverId: string, value: unknown): Result<McpProgressSnapshot> {
    if (!isServerId(serverId)) {
      return err(this.error("MCP progress state server id is invalid."));
    }
    const notification = this.classifier.parse(value);
    if (!notification.ok) return notification;
    if (
      notification.value.total !== undefined &&
      notification.value.progress > notification.value.total
    ) {
      return err(this.error("MCP progress exceeds the reported total."));
    }

    const entryKey = key(serverId, notification.value.progressToken);
    const previous = this.entries.get(entryKey);
    if (previous !== undefined) {
      if (notification.value.progress < previous.progress) {
        return err(this.error("MCP progress cannot regress for an active token."));
      }
      if (
        previous.total !== undefined &&
        notification.value.total !== undefined &&
        notification.value.total < previous.total
      ) {
        return err(this.error("MCP progress total cannot regress for an active token."));
      }
    }

    const snapshot: McpProgressSnapshot = {
      server_id: serverId,
      progressToken: notification.value.progressToken,
      progress: notification.value.progress,
      ...(notification.value.total === undefined
        ? previous?.total === undefined
          ? {}
          : { total: previous.total }
        : { total: notification.value.total }),
      ...(notification.value.message === undefined
        ? previous?.message === undefined
          ? {}
          : { message: previous.message }
        : { message: notification.value.message }),
    };
    this.entries.set(entryKey, snapshot);
    while (this.entries.size > MAX_ENTRIES) {
      const oldest = this.entries.keys().next().value as string | undefined;
      if (oldest === undefined) break;
      this.entries.delete(oldest);
    }
    return ok(clone(snapshot));
  }

  public get(serverId: string, progressToken: unknown): Result<ProgressLookup> {
    if (!isServerId(serverId) || !isProgressToken(progressToken)) {
      return err(this.error("MCP progress state lookup is invalid."));
    }
    const snapshot = this.entries.get(key(serverId, progressToken));
    return snapshot === undefined
      ? ok({ server_id: serverId, progressToken, status: "miss" })
      : ok(clone(snapshot));
  }

  public clearServer(serverId: string): Result<void> {
    if (!isServerId(serverId)) {
      return err(this.error("MCP progress state cleanup server id is invalid."));
    }
    const prefix = `${serverId}\u0000`;
    for (const entryKey of this.entries.keys()) {
      if (entryKey.startsWith(prefix)) this.entries.delete(entryKey);
    }
    return ok(undefined);
  }

  public clear(serverId: string, progressToken: unknown): Result<void> {
    if (!isServerId(serverId) || !isProgressToken(progressToken)) {
      return err(this.error("MCP progress state clear is invalid."));
    }
    this.entries.delete(key(serverId, progressToken));
    return ok(undefined);
  }

  private error(message: string): ErrorInfo {
    return { code: "NOVA-CFG001", message, retryable: false };
  }
}

function isServerId(value: unknown): value is string {
  return typeof value === "string" && SERVER_ID_PATTERN.test(value);
}

function isProgressToken(value: unknown): value is McpProgressNotification["progressToken"] {
  return (
    (typeof value === "string" && value.length > 0 && value.length <= 256) ||
    (typeof value === "number" && Number.isSafeInteger(value))
  );
}

function key(serverId: string, progressToken: string | number): string {
  return `${serverId}\u0000${typeof progressToken}:${String(progressToken)}`;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
