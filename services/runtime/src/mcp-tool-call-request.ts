import { err, ok, type ErrorInfo, type Result } from "@nova/shared";

export interface McpToolCallRequest {
  readonly jsonrpc: "2.0";
  readonly id: number;
  readonly method: "tools/call";
  readonly params: {
    readonly name: string;
    readonly arguments: Readonly<Record<string, unknown>>;
  };
}

const MAX_TOOL_NAME_LENGTH = 128;
const MAX_ARGUMENT_BYTES = 131_072;
const MAX_REQUEST_ID = Number.MAX_SAFE_INTEGER;

export class McpToolCallRequestBuilder {
  private nextRequestId = 1;

  public create(
    toolName: string,
    argumentsValue: Readonly<Record<string, unknown>> = {},
  ): Result<McpToolCallRequest> {
    if (!isToolName(toolName) || !isRecord(argumentsValue)) {
      return err(this.error("MCP tools/call request is malformed."));
    }
    const serialized = safeJson(argumentsValue);
    if (serialized === undefined || serialized.length > MAX_ARGUMENT_BYTES) {
      return err(this.error("MCP tools/call arguments are invalid or too large."));
    }
    if (this.nextRequestId > MAX_REQUEST_ID) {
      return err(this.error("MCP request identifier space is exhausted."));
    }

    const id = this.nextRequestId;
    this.nextRequestId += 1;
    return ok({
      jsonrpc: "2.0",
      id,
      method: "tools/call",
      params: {
        name: toolName,
        arguments: JSON.parse(serialized) as Readonly<Record<string, unknown>>,
      },
    });
  }

  private error(message: string): ErrorInfo {
    return { code: "NOVA-TL002", message, retryable: false };
  }
}

function isToolName(value: string): boolean {
  return (
    value.length > 0 && value.length <= MAX_TOOL_NAME_LENGTH && /^[A-Za-z0-9_.-]+$/.test(value)
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
