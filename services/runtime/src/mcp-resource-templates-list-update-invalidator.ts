import { err, ok, type ErrorInfo, type Result } from "@nova/shared";
import type { McpResourceTemplatesListCache } from "./mcp-resource-templates-list-cache.js";
import { McpListChangedNotificationClassifier } from "./mcp-list-changed-notification.js";

export interface McpResourceTemplatesListInvalidation {
  readonly server_id: string;
  readonly status: "invalidated";
}

const SERVER_ID_PATTERN = /^[A-Za-z0-9_.-]{1,128}$/;

export class McpResourceTemplatesListUpdateInvalidator {
  private readonly classifier = new McpListChangedNotificationClassifier();

  public constructor(private readonly cache: McpResourceTemplatesListCache) {}

  public apply(serverId: string, value: unknown): Result<McpResourceTemplatesListInvalidation> {
    if (!SERVER_ID_PATTERN.test(serverId)) {
      return err(this.error("MCP resource-template list update server id is invalid."));
    }
    const notification = this.classifier.parse(value);
    if (!notification.ok) return notification;
    if (notification.value.capability !== "resources") {
      return err(this.error("MCP list-changed notification is not a resources update."));
    }

    const invalidated = this.cache.invalidate(serverId);
    if (!invalidated.ok) return invalidated;
    return ok({ server_id: serverId, status: "invalidated" });
  }

  private error(message: string): ErrorInfo {
    return { code: "NOVA-CFG001", message, retryable: false };
  }
}
