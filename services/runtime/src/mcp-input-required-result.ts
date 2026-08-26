import { err, ok, type ErrorInfo, type Result } from "@nova/shared";
import {
  McpElicitationRequestValidator,
  type McpElicitationRequest,
} from "./mcp-elicitation-request.js";

export interface McpInputRequiredResult {
  readonly input_requests?: Readonly<Record<string, McpElicitationRequest>>;
  readonly request_state?: string;
}

const MAX_RESPONSE_BYTES = 131_072;
const MAX_INPUT_REQUESTS = 32;
const MAX_INPUT_REQUEST_KEY_LENGTH = 128;
const MAX_REQUEST_STATE_LENGTH = 8_192;

export class McpInputRequiredResultValidator {
  private readonly elicitationValidator = new McpElicitationRequestValidator();

  public parse(response: unknown, expectedId: string | number): Result<McpInputRequiredResult> {
    const serialized = safeJson(response);
    if (serialized === undefined || serialized.length > MAX_RESPONSE_BYTES) {
      return err(this.error("MCP input-required result is invalid or too large."));
    }
    if (!isRecord(response) || response.jsonrpc !== "2.0" || response.id !== expectedId) {
      return err(this.error("MCP input-required result correlation is invalid."));
    }
    if ("error" in response || !isRecord(response.result)) {
      return err(this.error("MCP input-required result is not a successful result."));
    }
    if (response.result.resultType !== "input_required") {
      return err(this.error("MCP input-required result type is malformed."));
    }

    const inputRequests = parseInputRequests(
      response.result.inputRequests,
      this.elicitationValidator,
    );
    if (!inputRequests.ok) return inputRequests;
    const requestState = parseRequestState(response.result.requestState);
    if (!requestState.ok) return requestState;
    if (inputRequests.value === undefined && requestState.value === undefined) {
      return err(this.error("MCP input-required result has no additional input."));
    }

    return ok({
      ...(inputRequests.value === undefined ? {} : { input_requests: inputRequests.value }),
      ...(requestState.value === undefined ? {} : { request_state: requestState.value }),
    });
  }

  private error(message: string): ErrorInfo {
    return { code: "NOVA-TL002", message, retryable: false };
  }
}

function parseInputRequests(
  value: unknown,
  elicitationValidator: McpElicitationRequestValidator,
): Result<Readonly<Record<string, McpElicitationRequest>> | undefined> {
  if (value === undefined) return ok(undefined);
  if (!isRecord(value)) return err(invalidInput());
  const keys = Object.keys(value);
  if (keys.length === 0 || keys.length > MAX_INPUT_REQUESTS) return err(invalidInput());

  const normalized: Record<string, McpElicitationRequest> = {};
  for (const key of keys) {
    if (!isSafeInputRequestKey(key)) return err(invalidInput());
    const parsed = elicitationValidator.parse(value[key]);
    if (!parsed.ok) return err(invalidInput());
    normalized[key] = parsed.value;
  }
  return ok(normalized);
}

function parseRequestState(value: unknown): Result<string | undefined> {
  if (value === undefined) return ok(undefined);
  if (typeof value !== "string" || value.length === 0 || value.length > MAX_REQUEST_STATE_LENGTH) {
    return err(invalidInput());
  }
  return ok(value);
}

function isSafeInputRequestKey(value: string): boolean {
  if (value.length === 0 || value.length > MAX_INPUT_REQUEST_KEY_LENGTH) return false;
  for (const character of value) {
    const code = character.charCodeAt(0);
    if (code <= 0x1f || code === 0x7f) return false;
  }
  return true;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function invalidInput(): ErrorInfo {
  return {
    code: "NOVA-TL002",
    message: "MCP input-required result input is malformed or too large.",
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
