import { err, ok, type ErrorInfo, type Result } from "@nova/shared";

export interface McpProgressNotification {
  readonly method: "notifications/progress";
  readonly progressToken: string | number;
  readonly progress: number;
  readonly total?: number;
  readonly message?: string;
}

const MAX_NOTIFICATION_BYTES = 131_072;
const MAX_PROGRESS_TOKEN_LENGTH = 256;
const MAX_MESSAGE_LENGTH = 2_048;

export class McpProgressNotificationClassifier {
  public parse(value: unknown): Result<McpProgressNotification> {
    const serialized = safeJson(value);
    if (serialized === undefined || serialized.length > MAX_NOTIFICATION_BYTES) {
      return err(this.error("MCP progress notification is invalid or too large."));
    }
    if (!isRecord(value) || value.jsonrpc !== "2.0" || value.id !== undefined) {
      return err(this.error("MCP progress notification is not a notification."));
    }
    if (value.method !== "notifications/progress" || !isRecord(value.params)) {
      return err(this.error("MCP progress notification is malformed."));
    }

    const progressToken = parseProgressToken(value.params.progressToken);
    const progress = parseNonNegativeNumber(value.params.progress);
    const total = parseOptionalNonNegativeNumber(value.params.total);
    const message = parseOptionalMessage(value.params.message);
    if (progressToken === undefined || progress === undefined || total.invalid || message.invalid) {
      return err(this.error("MCP progress notification fields are malformed or too large."));
    }

    return ok({
      method: "notifications/progress",
      progressToken,
      progress,
      ...(total.value === undefined ? {} : { total: total.value }),
      ...(message.value === undefined ? {} : { message: message.value }),
    });
  }

  private error(message: string): ErrorInfo {
    return { code: "NOVA-TL002", message, retryable: false };
  }
}

function parseProgressToken(value: unknown): string | number | undefined {
  if (typeof value === "string") {
    return value.length > 0 && value.length <= MAX_PROGRESS_TOKEN_LENGTH ? value : undefined;
  }
  return typeof value === "number" && Number.isSafeInteger(value) ? value : undefined;
}

function parseNonNegativeNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined;
}

function parseOptionalNonNegativeNumber(value: unknown): {
  readonly value?: number;
  readonly invalid: boolean;
} {
  if (value === undefined) return { invalid: false };
  const parsed = parseNonNegativeNumber(value);
  return parsed === undefined ? { invalid: true } : { value: parsed, invalid: false };
}

function parseOptionalMessage(value: unknown): {
  readonly value?: string;
  readonly invalid: boolean;
} {
  if (value === undefined) return { invalid: false };
  if (typeof value !== "string" || value.length > MAX_MESSAGE_LENGTH) {
    return { invalid: true };
  }
  return { value, invalid: false };
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
