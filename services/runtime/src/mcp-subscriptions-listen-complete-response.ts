import { err, ok, type ErrorInfo, type Result } from "@nova/shared";

export interface McpSubscriptionsListenCompleteResponse {
  readonly request_id: string | number;
  readonly subscription_id: string | number;
  readonly result_type: "complete";
}

const MAX_RESPONSE_BYTES = 131_072;
const MAX_ID_LENGTH = 256;

export class McpSubscriptionsListenCompleteResponseValidator {
  public parse(value: unknown): Result<McpSubscriptionsListenCompleteResponse> {
    const serialized = safeJson(value);
    if (serialized === undefined || serialized.length > MAX_RESPONSE_BYTES) {
      return err(this.error("MCP subscriptions/listen completion is invalid or too large."));
    }
    if (!isRecord(value) || value.jsonrpc !== "2.0" || !isRequestId(value.id)) {
      return err(this.error("MCP subscriptions/listen completion correlation is invalid."));
    }
    if (!isRecord(value.result) || value.result.resultType !== "complete") {
      return err(this.error("MCP subscriptions/listen completion result is malformed."));
    }
    if (!isRecord(value.result._meta)) {
      return err(this.error("MCP subscriptions/listen completion is missing metadata."));
    }
    const subscriptionId = value.result._meta["io.modelcontextprotocol/subscriptionId"];
    if (!isRequestId(subscriptionId) || !sameRequestId(value.id, subscriptionId)) {
      return err(this.error("MCP subscriptions/listen completion correlation does not match."));
    }
    return ok({
      request_id: value.id,
      subscription_id: subscriptionId,
      result_type: "complete",
    });
  }

  private error(message: string): ErrorInfo {
    return { code: "NOVA-TL002", message, retryable: false };
  }
}

function isRequestId(value: unknown): value is string | number {
  return (
    (typeof value === "string" && value.length > 0 && value.length <= MAX_ID_LENGTH) ||
    (typeof value === "number" && Number.isSafeInteger(value))
  );
}

function sameRequestId(left: string | number, right: string | number): boolean {
  return left === right;
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
