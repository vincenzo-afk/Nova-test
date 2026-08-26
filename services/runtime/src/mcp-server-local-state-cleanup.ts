import { err, ok, type ErrorInfo, type Result } from "@nova/shared";
import type { McpServerHealthTracker } from "./mcp-server-health.js";
import type { McpSubscriptionState } from "./mcp-subscription-state.js";

export interface McpServerLocalStateCleanupDependencies {
  readonly toolsCache?: ServerCache;
  readonly promptCache?: ServerCache;
  readonly resourceCache?: ServerCache;
  readonly templateCache?: ServerCache;
  readonly discoveryCache?: ServerCache;
  readonly health?: Pick<McpServerHealthTracker, "remove">;
  readonly subscriptions?: Pick<McpSubscriptionState, "clearServer">;
}

export interface McpServerLocalStateCleared {
  readonly server_id: string;
  readonly status: "cleared";
}

interface ServerCache {
  invalidate(serverId: string): Result<void>;
}

const SERVER_ID_PATTERN = /^[A-Za-z0-9_.-]{1,128}$/;

export class McpServerLocalStateCleanup {
  public constructor(private readonly dependencies: McpServerLocalStateCleanupDependencies) {}

  public clear(serverId: string): Result<McpServerLocalStateCleared> {
    if (!SERVER_ID_PATTERN.test(serverId)) {
      return err(this.error("MCP server local-state cleanup server id is invalid."));
    }
    for (const cache of [
      this.dependencies.toolsCache,
      this.dependencies.promptCache,
      this.dependencies.resourceCache,
      this.dependencies.templateCache,
      this.dependencies.discoveryCache,
    ]) {
      if (cache === undefined) continue;
      const result = cache.invalidate(serverId);
      if (!result.ok) return result;
    }
    if (this.dependencies.health !== undefined) {
      const result = this.dependencies.health.remove(serverId);
      if (!result.ok) return result;
    }
    if (this.dependencies.subscriptions !== undefined) {
      const result = this.dependencies.subscriptions.clearServer(serverId);
      if (!result.ok) return result;
    }
    return ok({ server_id: serverId, status: "cleared" });
  }

  private error(message: string): ErrorInfo {
    return { code: "NOVA-CFG001", message, retryable: false };
  }
}
