import { err, ok, type ErrorInfo, type Result } from "@nova/shared";

export interface McpPromptGetRequest {
  readonly jsonrpc: "2.0";
  readonly id: number;
  readonly method: "prompts/get";
  readonly params: {
    readonly name: string;
    readonly arguments?: Readonly<Record<string, string>>;
    readonly inputResponses?: Readonly<Record<string, string | readonly string[]>>;
    readonly requestState?: string;
  };
}

const MAX_PROMPT_NAME_LENGTH = 128;
const MAX_REQUEST_ID = Number.MAX_SAFE_INTEGER;
const MAX_ARGUMENT_KEYS = 64;
const MAX_ARGUMENT_KEY_LENGTH = 128;
const MAX_ARGUMENT_VALUE_LENGTH = 8_192;
const MAX_INPUT_RESPONSE_KEYS = 64;
const MAX_INPUT_RESPONSE_KEY_LENGTH = 128;
const MAX_INPUT_RESPONSE_VALUE_LENGTH = 8_192;
const MAX_INPUT_RESPONSE_ITEMS = 32;
const MAX_REQUEST_STATE_LENGTH = 8_192;
const MAX_REQUEST_BYTES = 131_072;

export class McpPromptGetRequestBuilder {
  private nextRequestId = 1;

  public create(
    name: string,
    options: Readonly<Record<string, unknown>> = {},
  ): Result<McpPromptGetRequest> {
    if (!isPromptName(name) || !isRecord(options)) {
      return err(this.error("MCP prompts/get request is malformed."));
    }

    const argumentsValue = parseArguments(options.arguments);
    if (!argumentsValue.ok) return argumentsValue;
    const inputResponses = parseInputResponses(options.inputResponses);
    if (!inputResponses.ok) return inputResponses;
    if (
      options.requestState !== undefined &&
      (typeof options.requestState !== "string" ||
        options.requestState.length > MAX_REQUEST_STATE_LENGTH)
    ) {
      return err(this.error("MCP prompts/get request state is invalid or too large."));
    }

    const params = {
      name,
      ...(argumentsValue.value === undefined ? {} : { arguments: argumentsValue.value }),
      ...(inputResponses.value === undefined ? {} : { inputResponses: inputResponses.value }),
      ...(options.requestState === undefined ? {} : { requestState: options.requestState }),
    };
    const serialized = safeJson(params);
    if (serialized === undefined || serialized.length > MAX_REQUEST_BYTES) {
      return err(this.error("MCP prompts/get request is invalid or too large."));
    }
    if (this.nextRequestId > MAX_REQUEST_ID) {
      return err(this.error("MCP request identifier space is exhausted."));
    }

    const id = this.nextRequestId;
    this.nextRequestId += 1;
    return ok({
      jsonrpc: "2.0",
      id,
      method: "prompts/get",
      params: JSON.parse(serialized) as McpPromptGetRequest["params"],
    });
  }

  private error(message: string): ErrorInfo {
    return { code: "NOVA-TL002", message, retryable: false };
  }
}

function parseArguments(value: unknown): Result<Readonly<Record<string, string>> | undefined> {
  if (value === undefined) return ok(undefined);
  if (!isRecord(value)) return err(invalidArguments());
  const keys = Object.keys(value);
  if (keys.length > MAX_ARGUMENT_KEYS) return err(invalidArguments());

  const normalized: Record<string, string> = {};
  for (const key of keys) {
    const entry = value[key];
    if (
      key.length === 0 ||
      key.length > MAX_ARGUMENT_KEY_LENGTH ||
      typeof entry !== "string" ||
      entry.length > MAX_ARGUMENT_VALUE_LENGTH
    ) {
      return err(invalidArguments());
    }
    normalized[key] = entry;
  }
  return ok(cloneJson(normalized));
}

function parseInputResponses(
  value: unknown,
): Result<Readonly<Record<string, string | readonly string[]>> | undefined> {
  if (value === undefined) return ok(undefined);
  if (!isRecord(value)) return err(invalidInputResponses());
  const keys = Object.keys(value);
  if (keys.length > MAX_INPUT_RESPONSE_KEYS) return err(invalidInputResponses());

  const normalized: Record<string, string | readonly string[]> = {};
  for (const key of keys) {
    if (key.length === 0 || key.length > MAX_INPUT_RESPONSE_KEY_LENGTH) {
      return err(invalidInputResponses());
    }
    const entry = value[key];
    if (typeof entry === "string") {
      if (entry.length > MAX_INPUT_RESPONSE_VALUE_LENGTH) return err(invalidInputResponses());
      normalized[key] = entry;
      continue;
    }
    if (!Array.isArray(entry) || entry.length > MAX_INPUT_RESPONSE_ITEMS) {
      return err(invalidInputResponses());
    }
    const values: string[] = [];
    for (const item of entry) {
      if (typeof item !== "string" || item.length > MAX_INPUT_RESPONSE_VALUE_LENGTH) {
        return err(invalidInputResponses());
      }
      values.push(item);
    }
    normalized[key] = values;
  }
  return ok(cloneJson(normalized));
}

function isPromptName(value: string): boolean {
  return (
    value.length > 0 && value.length <= MAX_PROMPT_NAME_LENGTH && /^[A-Za-z0-9_.-]+$/.test(value)
  );
}

function invalidArguments(): ErrorInfo {
  return {
    code: "NOVA-TL002",
    message: "MCP prompts/get arguments are malformed or too large.",
    retryable: false,
  };
}

function invalidInputResponses(): ErrorInfo {
  return {
    code: "NOVA-TL002",
    message: "MCP prompts/get input responses are malformed or too large.",
    retryable: false,
  };
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function safeJson(value: unknown): string | undefined {
  try {
    const serialized = JSON.stringify(value);
    return serialized === undefined ? undefined : serialized;
  } catch {
    return undefined;
  }
}
