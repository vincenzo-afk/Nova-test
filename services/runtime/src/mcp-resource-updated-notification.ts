import { err, ok, type ErrorInfo, type Result } from "@nova/shared";

export interface McpResourceUpdatedNotification {
  readonly method: "notifications/resources/updated";
  readonly uri: string;
}

const MAX_URI_LENGTH = 2_048;
const MAX_NOTIFICATION_BYTES = 131_072;

export class McpResourceUpdatedNotificationClassifier {
  public parse(value: unknown): Result<McpResourceUpdatedNotification> {
    const serialized = safeJson(value);
    if (serialized === undefined || serialized.length > MAX_NOTIFICATION_BYTES) {
      return err(this.error("MCP resource-updated notification is invalid or too large."));
    }
    if (!isRecord(value) || value.jsonrpc !== "2.0" || value.id !== undefined) {
      return err(this.error("MCP resource-updated notification is not a notification."));
    }
    if (value.method !== "notifications/resources/updated" || !isRecord(value.params)) {
      return err(this.error("MCP resource-updated notification is malformed."));
    }
    if (!isSafeResourceUri(value.params.uri)) {
      return err(this.error("MCP resource-updated notification URI is unsafe or malformed."));
    }
    return ok({
      method: "notifications/resources/updated",
      uri: value.params.uri,
    });
  }

  private error(message: string): ErrorInfo {
    return { code: "NOVA-TL002", message, retryable: false };
  }
}

function isSafeResourceUri(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0 || value.length > MAX_URI_LENGTH) {
    return false;
  }
  if (/\s/.test(value)) return false;
  try {
    const url = new URL(value);
    if (!url.protocol || url.username !== "" || url.password !== "") return false;
    return !(
      url.protocol === "file:" && /(?:^|\/)\.\.(?:\/|$)/.test(value.slice(value.indexOf(":") + 1))
    );
  } catch {
    return false;
  }
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
