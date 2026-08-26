import { err, ok, type ErrorInfo, type Result } from "@nova/shared";

export type McpElicitationMode = "form" | "url";

export interface McpElicitationRequest {
  readonly method: "elicitation/create";
  readonly mode: McpElicitationMode;
  readonly message: string;
  readonly requested_schema?: Readonly<Record<string, unknown>>;
  readonly url?: string;
}

const MAX_REQUEST_BYTES = 131_072;
const MAX_MESSAGE_LENGTH = 2_048;
const MAX_URL_LENGTH = 2_048;
const MAX_SCHEMA_BYTES = 65_536;
const MAX_SCHEMA_KEYS = 128;

export class McpElicitationRequestValidator {
  public parse(value: unknown): Result<McpElicitationRequest> {
    const serialized = safeJson(value);
    if (serialized === undefined || serialized.length > MAX_REQUEST_BYTES) {
      return err(this.error("MCP elicitation request is invalid or too large."));
    }
    if (!isRecord(value) || value.method !== "elicitation/create" || !isRecord(value.params)) {
      return err(this.error("MCP elicitation request is malformed."));
    }
    if (!isBoundedString(value.params.message, MAX_MESSAGE_LENGTH)) {
      return err(this.error("MCP elicitation message is invalid or too large."));
    }

    const mode = value.params.mode === undefined ? "form" : value.params.mode;
    if (mode !== "form" && mode !== "url") {
      return err(this.error("MCP elicitation mode is unsupported."));
    }

    if (mode === "form") {
      const requestedSchema = parseRequestedSchema(value.params.requestedSchema);
      if (!requestedSchema.ok) return requestedSchema;
      return ok({
        method: "elicitation/create",
        mode,
        message: value.params.message,
        requested_schema: requestedSchema.value,
      });
    }

    const url = parseSafeUrl(value.params.url);
    if (!url) return err(this.error("MCP elicitation URL is invalid or unsafe."));
    return ok({
      method: "elicitation/create",
      mode,
      message: value.params.message,
      url,
    });
  }

  private error(message: string): ErrorInfo {
    return { code: "NOVA-TL002", message, retryable: false };
  }
}

function parseRequestedSchema(value: unknown): Result<Readonly<Record<string, unknown>>> {
  if (!isRecord(value) || value.type !== "object" || Object.keys(value).length > MAX_SCHEMA_KEYS) {
    return err(invalidSchema());
  }
  if (value.properties !== undefined && !isRecord(value.properties)) {
    return err(invalidSchema());
  }
  if (
    value.required !== undefined &&
    (!Array.isArray(value.required) || !value.required.every((item) => typeof item === "string"))
  ) {
    return err(invalidSchema());
  }
  const serialized = safeJson(value);
  if (serialized === undefined || serialized.length > MAX_SCHEMA_BYTES) {
    return err(invalidSchema());
  }
  return ok(JSON.parse(serialized) as Readonly<Record<string, unknown>>);
}

function parseSafeUrl(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length === 0 || value.length > MAX_URL_LENGTH) {
    return undefined;
  }
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" || parsed.username !== "" || parsed.password !== "") {
      return undefined;
    }
    return parsed.href;
  } catch {
    return undefined;
  }
}

function isBoundedString(value: unknown, maxLength: number): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= maxLength;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function invalidSchema(): ErrorInfo {
  return {
    code: "NOVA-TL002",
    message: "MCP elicitation requested schema is malformed or too large.",
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
