import { err, ok, type ErrorInfo, type Result } from "@nova/shared";

export interface McpCancellationNotification {
  readonly method: "notifications/cancelled";
  readonly request_id: string | number;
  readonly reason?: string;
}

const MAX_REQUEST_ID_LENGTH = 256;
const MAX_REASON_LENGTH = 2_048;
const MAX_NOTIFICATION_BYTES = 131_072;

export class McpCancellationNotificationClassifier {
  public parse(value: unknown): Result<McpCancellationNotification> {
    const serialized = safeJson(value);
    if (serialized === undefined || serialized.length > MAX_NOTIFICATION_BYTES) {
      return err(this.error("MCP cancellation notification is invalid or too large."));
    }
    if (!isRecord(value) || value.jsonrpc !== "2.0" || value.id !== undefined) {
      return err(this.error("MCP cancellation notification is not a notification."));
    }
    if (value.method !== "notifications/cancelled" || !isRecord(value.params)) {
      return err(this.error("MCP cancellation notification is malformed."));
    }
    if (!isRequestId(value.params.requestId)) {
      return err(this.error("MCP cancellation request ID is invalid."));
    }
    if (
      value.params.reason !== undefined &&
      (typeof value.params.reason !== "string" || value.params.reason.length > MAX_REASON_LENGTH)
    ) {
      return err(this.error("MCP cancellation reason is invalid or too large."));
    }

    return ok({
      method: "notifications/cancelled",
      request_id: value.params.requestId,
      ...(value.params.reason === undefined ? {} : { reason: value.params.reason }),
    });
  }

  private error(message: string): ErrorInfo {
    return { code: "NOVA-TL002", message, retryable: false };
  }
}

function isRequestId(value: unknown): value is string | number {
  return (
    (typeof value === "string" && value.length > 0 && value.length <= MAX_REQUEST_ID_LENGTH) ||
    (typeof value === "number" && Number.isSafeInteger(value))
  );
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
