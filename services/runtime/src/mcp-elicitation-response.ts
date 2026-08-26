import { err, ok, type ErrorInfo, type Result } from "@nova/shared";

export type McpElicitationResponseAction = "accept" | "decline" | "cancel";

export interface McpElicitationResponse {
  readonly action: McpElicitationResponseAction;
  readonly content?: Readonly<Record<string, unknown>>;
}

const MAX_RESPONSE_BYTES = 131_072;
const MAX_CONTENT_BYTES = 65_536;
const MAX_CONTENT_KEYS = 128;

export class McpElicitationResponseValidator {
  public parse(value: unknown): Result<McpElicitationResponse> {
    const serialized = safeJson(value);
    if (serialized === undefined || serialized.length > MAX_RESPONSE_BYTES) {
      return err(this.error("MCP elicitation response is invalid or too large."));
    }
    if (!isRecord(value) || !isAction(value.action)) {
      return err(this.error("MCP elicitation response action is invalid."));
    }

    if (value.content === undefined) {
      return ok({ action: value.action });
    }
    const content = parseContent(value.content);
    if (!content.ok) return content;
    return ok({ action: value.action, content: content.value });
  }

  private error(message: string): ErrorInfo {
    return { code: "NOVA-TL002", message, retryable: false };
  }
}

function parseContent(value: unknown): Result<Readonly<Record<string, unknown>>> {
  if (!isRecord(value) || Object.keys(value).length > MAX_CONTENT_KEYS) {
    return err(invalidContent());
  }
  const serialized = safeJson(value);
  if (serialized === undefined || serialized.length > MAX_CONTENT_BYTES) {
    return err(invalidContent());
  }
  return ok(JSON.parse(serialized) as Readonly<Record<string, unknown>>);
}

function isAction(value: unknown): value is McpElicitationResponseAction {
  return value === "accept" || value === "decline" || value === "cancel";
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function invalidContent(): ErrorInfo {
  return {
    code: "NOVA-TL002",
    message: "MCP elicitation response content is malformed or too large.",
    retryable: false,
  };
}

function safeJson(value: unknown): string | undefined {
  try {
    const serialized = JSON.stringify(value);
    return serialized === undefined ? undefined : serialized;
  } catch {
    return undefined;
  }
}
