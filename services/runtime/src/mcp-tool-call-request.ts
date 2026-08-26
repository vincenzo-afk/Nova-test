import { err, ok, type ErrorInfo, type Result } from "@nova/shared";
import {
  McpElicitationResponseValidator,
  type McpElicitationResponse,
} from "./mcp-elicitation-response.js";

export interface McpToolCallRequest {
  readonly jsonrpc: "2.0";
  readonly id: number;
  readonly method: "tools/call";
  readonly params: {
    readonly name: string;
    readonly arguments: Readonly<Record<string, unknown>>;
    readonly inputResponses?: Readonly<Record<string, McpElicitationResponse>>;
    readonly requestState?: string;
  };
}

const MAX_TOOL_NAME_LENGTH = 128;
const MAX_ARGUMENT_BYTES = 131_072;
const MAX_REQUEST_BYTES = 131_072;
const MAX_REQUEST_ID = Number.MAX_SAFE_INTEGER;
const MAX_INPUT_RESPONSES = 32;
const MAX_INPUT_RESPONSE_KEY_LENGTH = 128;
const MAX_REQUEST_STATE_LENGTH = 8_192;

export class McpToolCallRequestBuilder {
  private nextRequestId = 1;
  private readonly elicitationResponseValidator = new McpElicitationResponseValidator();

  public create(
    toolName: string,
    argumentsValue: Readonly<Record<string, unknown>> = {},
    options: Readonly<Record<string, unknown>> = {},
  ): Result<McpToolCallRequest> {
    if (!isToolName(toolName) || !isRecord(argumentsValue) || !isRecord(options)) {
      return err(this.error("MCP tools/call request is malformed."));
    }
    const serializedArguments = safeJson(argumentsValue);
    if (serializedArguments === undefined || serializedArguments.length > MAX_ARGUMENT_BYTES) {
      return err(this.error("MCP tools/call arguments are invalid or too large."));
    }

    const inputResponses = parseInputResponses(
      options.inputResponses,
      this.elicitationResponseValidator,
    );
    if (!inputResponses.ok) return inputResponses;
    if (
      options.requestState !== undefined &&
      (typeof options.requestState !== "string" ||
        options.requestState.length === 0 ||
        options.requestState.length > MAX_REQUEST_STATE_LENGTH)
    ) {
      return err(this.error("MCP tools/call request state is invalid or too large."));
    }
    if (this.nextRequestId > MAX_REQUEST_ID) {
      return err(this.error("MCP request identifier space is exhausted."));
    }

    const params = {
      name: toolName,
      arguments: JSON.parse(serializedArguments) as Readonly<Record<string, unknown>>,
      ...(inputResponses.value === undefined ? {} : { inputResponses: inputResponses.value }),
      ...(options.requestState === undefined ? {} : { requestState: options.requestState }),
    };
    const serializedRequest = safeJson({
      jsonrpc: "2.0",
      id: this.nextRequestId,
      method: "tools/call",
      params,
    });
    if (serializedRequest === undefined || serializedRequest.length > MAX_REQUEST_BYTES) {
      return err(this.error("MCP tools/call request is invalid or too large."));
    }

    this.nextRequestId += 1;
    return ok(JSON.parse(serializedRequest) as McpToolCallRequest);
  }

  private error(message: string): ErrorInfo {
    return { code: "NOVA-TL002", message, retryable: false };
  }
}

function parseInputResponses(
  value: unknown,
  validator: McpElicitationResponseValidator,
): Result<Readonly<Record<string, McpElicitationResponse>> | undefined> {
  if (value === undefined) return ok(undefined);
  if (!isRecord(value)) return err(invalidInputResponses());
  const keys = Object.keys(value);
  if (keys.length === 0 || keys.length > MAX_INPUT_RESPONSES) {
    return err(invalidInputResponses());
  }

  const normalized: Record<string, McpElicitationResponse> = {};
  for (const key of keys) {
    if (key.length === 0 || key.length > MAX_INPUT_RESPONSE_KEY_LENGTH) {
      return err(invalidInputResponses());
    }
    const parsed = validator.parse(value[key]);
    if (!parsed.ok) return err(invalidInputResponses());
    normalized[key] = parsed.value;
  }
  return ok(normalized);
}

function isToolName(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= MAX_TOOL_NAME_LENGTH &&
    /^[A-Za-z0-9_.-]+$/.test(value)
  );
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function invalidInputResponses(): ErrorInfo {
  return {
    code: "NOVA-TL002",
    message: "MCP tools/call input responses are malformed or too large.",
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
