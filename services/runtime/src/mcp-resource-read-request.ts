import { err, ok, type ErrorInfo, type Result } from "@nova/shared";

export interface McpResourceReadRequest {
  readonly jsonrpc: "2.0";
  readonly id: number;
  readonly method: "resources/read";
  readonly params: {
    readonly uri: string;
    readonly inputResponses?: Readonly<Record<string, string | readonly string[]>>;
    readonly requestState?: string;
  };
}

const MAX_URI_LENGTH = 2_048;
const MAX_REQUEST_ID = Number.MAX_SAFE_INTEGER;
const MAX_INPUT_RESPONSE_KEYS = 64;
const MAX_INPUT_RESPONSE_KEY_LENGTH = 128;
const MAX_INPUT_RESPONSE_VALUE_LENGTH = 8_192;
const MAX_INPUT_RESPONSE_ITEMS = 32;
const MAX_REQUEST_STATE_LENGTH = 8_192;
const MAX_REQUEST_BYTES = 131_072;

export class McpResourceReadRequestBuilder {
  private nextRequestId = 1;

  public create(
    uri: string,
    options: Readonly<Record<string, unknown>> = {},
  ): Result<McpResourceReadRequest> {
    if (!isSafeResourceUri(uri) || !isRecord(options)) {
      return err(this.error("MCP resources/read request is malformed."));
    }

    const inputResponses = parseInputResponses(options.inputResponses);
    if (!inputResponses.ok) return inputResponses;
    if (
      options.requestState !== undefined &&
      (typeof options.requestState !== "string" ||
        options.requestState.length > MAX_REQUEST_STATE_LENGTH)
    ) {
      return err(this.error("MCP resources/read request state is invalid or too large."));
    }

    const params = {
      uri,
      ...(inputResponses.value === undefined ? {} : { inputResponses: inputResponses.value }),
      ...(options.requestState === undefined ? {} : { requestState: options.requestState }),
    };
    const serialized = safeJson(params);
    if (serialized === undefined || serialized.length > MAX_REQUEST_BYTES) {
      return err(this.error("MCP resources/read request is invalid or too large."));
    }
    if (this.nextRequestId > MAX_REQUEST_ID) {
      return err(this.error("MCP request identifier space is exhausted."));
    }

    const id = this.nextRequestId;
    this.nextRequestId += 1;
    return ok({
      jsonrpc: "2.0",
      id,
      method: "resources/read",
      params: JSON.parse(serialized) as McpResourceReadRequest["params"],
    });
  }

  private error(message: string): ErrorInfo {
    return { code: "NOVA-TL002", message, retryable: false };
  }
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

  const serialized = safeJson(normalized);
  if (serialized === undefined || serialized.length > MAX_REQUEST_BYTES) {
    return err(invalidInputResponses());
  }
  return ok(JSON.parse(serialized) as Readonly<Record<string, string | readonly string[]>>);
}

function isSafeResourceUri(value: string): boolean {
  if (value.length === 0 || value.length > MAX_URI_LENGTH || /\s/.test(value)) return false;
  try {
    const url = new URL(value);
    if (!url.protocol || url.username !== "" || url.password !== "") return false;
    if (
      url.protocol === "file:" &&
      /(?:^|\/)\.\.(?:\/|$)/.test(value.slice(value.indexOf(":") + 1))
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function invalidInputResponses(): ErrorInfo {
  return {
    code: "NOVA-TL002",
    message: "MCP resources/read input responses are malformed or too large.",
    retryable: false,
  };
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
