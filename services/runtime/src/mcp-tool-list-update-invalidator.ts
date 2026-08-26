import { err, ok } from "@nova/shared";
import type { ErrorInfo, Result } from "@nova/shared";
import type { McpToolCache } from "./mcp-tool-cache.js";
import { McpListChangedNotificationClassifier } from "./mcp-list-changed-notification.js";

export interface McpToolListInvalidation {
  readonly server_id: string;
  readonly status: "invalidated";
}

const SERVER_ID_PATTERN = /^[A-Za-z0-9_.-]{1,128}$/;

export class McpToolListUpdateInvalidator {
  private readonly classifier = new McpListChangedNotificationClassifier();

  public constructor(private readonly cache: McpToolCache) {}

  public apply(serverId: string, value: unknown): Result<McpToolListInvalidation> {
    if (!isServerId(serverId)) {
      return err(this.error("MCP tool list update server id is invalid."));
    }
    const notification = this.classifier.parse(value);
    if (!notification.ok) return notification;
    if (notification.value.capability !== "tools") {
      return err(this.error("MCP list-changed notification is not a tools update."));
    }

    const invalidated = this.cache.invalidate(serverId);
    if (!invalidated.ok) return invalidated;
    return ok({ server_id: serverId, status: "invalidated" });
  }

  private error(message: string): ErrorInfo {
    return { code: "NOVA-CFG001", message, retryable: false };
  }
}

function isServerId(value: unknown): value is string {
  return typeof value === "string" && SERVER_ID_PATTERN.test(value);
}
