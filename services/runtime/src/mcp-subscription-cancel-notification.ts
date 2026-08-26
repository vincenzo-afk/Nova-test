import { err, ok, type ErrorInfo, type Result } from "@nova/shared";

export interface McpSubscriptionCancelNotification {
  readonly jsonrpc: "2.0";
  readonly method: "notifications/cancelled";
  readonly params: {
    readonly requestId: string | number;
  };
}

const MAX_REQUEST_ID_LENGTH = 256;

export class McpSubscriptionCancelNotificationBuilder {
  public create(requestId: unknown): Result<McpSubscriptionCancelNotification> {
    if (!isRequestId(requestId)) {
      return err(this.error("MCP subscription cancellation request ID is invalid."));
    }
    return ok({
      jsonrpc: "2.0",
      method: "notifications/cancelled",
      params: { requestId },
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
