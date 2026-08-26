import { err, ok } from "@nova/shared";
import type { ErrorInfo, Result } from "@nova/shared";
import type { McpResourceCache } from "./mcp-resource-cache.js";
import { McpResourceUpdatedNotificationClassifier } from "./mcp-resource-updated-notification.js";

export interface McpResourceInvalidation {
  readonly server_id: string;
  readonly uri: string;
  readonly status: "invalidated";
}

const SERVER_ID_PATTERN = /^[A-Za-z0-9_.-]{1,128}$/;

export class McpResourceUpdateInvalidator {
  private readonly classifier = new McpResourceUpdatedNotificationClassifier();

  public constructor(private readonly cache: McpResourceCache) {}

  public apply(serverId: string, value: unknown): Result<McpResourceInvalidation> {
    if (!SERVER_ID_PATTERN.test(serverId)) {
      return err(this.error("MCP resource update server id is invalid."));
    }
    const notification = this.classifier.parse(value);
    if (!notification.ok) return notification;

    const invalidated = this.cache.invalidate(serverId, notification.value.uri);
    if (!invalidated.ok) return invalidated;
    return ok({
      server_id: serverId,
      uri: notification.value.uri,
      status: "invalidated",
    });
  }

  private error(message: string): ErrorInfo {
    return { code: "NOVA-CFG001", message, retryable: false };
  }
}
