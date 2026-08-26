import { err, ok, type ErrorInfo, type Result } from "@nova/shared";

export type McpServerHealth = "reachable" | "degraded" | "down" | "unknown";

export interface McpServerHealthSummary {
  readonly server_id: string;
  readonly health: McpServerHealth;
  readonly checked_at: string | null;
}

const MAX_PUBLIC_HEALTH_RECORDS = 128;
const MAX_SERVER_ID_LENGTH = 128;

export class McpServerHealthTracker {
  private readonly observations = new Map<string, McpServerHealthSummary>();

  public record(
    serverId: string,
    health: Exclude<McpServerHealth, "unknown">,
    checkedAt: string,
  ): Result<McpServerHealthSummary> {
    if (!isServerId(serverId) || !isObservedHealth(health) || !isTimestamp(checkedAt)) {
      return err(this.error("MCP health observation is invalid."));
    }
    const summary: McpServerHealthSummary = {
      server_id: serverId,
      health,
      checked_at: checkedAt,
    };
    this.observations.set(serverId, summary);
    return ok(clone(summary));
  }

  public get(serverId: string): Result<McpServerHealthSummary> {
    if (!isServerId(serverId)) return err(this.error("MCP server id is invalid."));
    const observation = this.observations.get(serverId);
    return ok(
      observation
        ? clone(observation)
        : { server_id: serverId, health: "unknown", checked_at: null },
    );
  }

  public list(): readonly McpServerHealthSummary[] {
    return [...this.observations.values()]
      .sort((left, right) => left.server_id.localeCompare(right.server_id))
      .slice(0, MAX_PUBLIC_HEALTH_RECORDS)
      .map(clone);
  }

  public remove(serverId: string): Result<void> {
    if (!isServerId(serverId)) return err(this.error("MCP server id is invalid."));
    this.observations.delete(serverId);
    return ok(undefined);
  }

  private error(message: string): ErrorInfo {
    return { code: "NOVA-CFG001", message, retryable: false };
  }
}

function isServerId(value: string): boolean {
  return (
    value.length > 0 && value.length <= MAX_SERVER_ID_LENGTH && /^[A-Za-z0-9_.-]+$/.test(value)
  );
}

function isObservedHealth(value: unknown): value is Exclude<McpServerHealth, "unknown"> {
  return value === "reachable" || value === "degraded" || value === "down";
}

function isTimestamp(value: string): boolean {
  return value.length <= 64 && !Number.isNaN(Date.parse(value));
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
