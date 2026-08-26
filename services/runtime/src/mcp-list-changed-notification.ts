import { err, ok, type ErrorInfo, type Result } from "@nova/shared";

export type McpListChangedCapability = "resources" | "prompts" | "tools";

export interface McpListChangedNotification {
  readonly capability: McpListChangedCapability;
  readonly method:
    | "notifications/resources/list_changed"
    | "notifications/prompts/list_changed"
    | "notifications/tools/list_changed";
}

const MAX_NOTIFICATION_BYTES = 131_072;
const SUPPORTED_METHODS = {
  "notifications/resources/list_changed": "resources",
  "notifications/prompts/list_changed": "prompts",
  "notifications/tools/list_changed": "tools",
} as const;

export class McpListChangedNotificationClassifier {
  public parse(value: unknown): Result<McpListChangedNotification> {
    const serialized = safeJson(value);
    if (serialized === undefined || serialized.length > MAX_NOTIFICATION_BYTES) {
      return err(this.error("MCP list-changed notification is invalid or too large."));
    }
    if (!isRecord(value) || value.jsonrpc !== "2.0" || value.id !== undefined) {
      return err(this.error("MCP list-changed notification is not a notification."));
    }
    if (!isListChangedMethod(value.method)) {
      return err(this.error("MCP list-changed notification method is unsupported."));
    }

    return ok({
      capability: SUPPORTED_METHODS[value.method],
      method: value.method,
    });
  }

  private error(message: string): ErrorInfo {
    return { code: "NOVA-TL002", message, retryable: false };
  }
}

function isListChangedMethod(value: unknown): value is keyof typeof SUPPORTED_METHODS {
  return typeof value === "string" && value in SUPPORTED_METHODS;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeJson(value: unknown): string | undefined {
  try {
    const serialized = JSON.stringify(value);
    return serialized === undefined ? undefined : serialized;
  } catch {
    return undefined;
  }
}
