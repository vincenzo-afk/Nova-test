import { err, ok, type ErrorInfo, type Result } from "@nova/shared";

export interface McpServerDiscoverRequest {
  readonly jsonrpc: "2.0";
  readonly id: number;
  readonly method: "server/discover";
  readonly params: {
    readonly _meta: {
      readonly "io.modelcontextprotocol/protocolVersion": string;
      readonly "io.modelcontextprotocol/clientInfo": {
        readonly name: string;
        readonly version: string;
      };
      readonly "io.modelcontextprotocol/clientCapabilities": Readonly<Record<string, unknown>>;
    };
  };
}

const MAX_REQUEST_ID = Number.MAX_SAFE_INTEGER;
const MAX_PROTOCOL_VERSION_LENGTH = 64;
const MAX_CLIENT_INFO_FIELD_LENGTH = 256;
const MAX_CAPABILITY_KEYS = 64;
const MAX_REQUEST_BYTES = 131_072;

export class McpServerDiscoverRequestBuilder {
  private nextRequestId = 1;

  public create(options: Readonly<Record<string, unknown>>): Result<McpServerDiscoverRequest> {
    if (!isRecord(options)) return err(this.error("MCP server/discover request is malformed."));

    const protocolVersion = parseBoundedString(
      options.protocolVersion,
      MAX_PROTOCOL_VERSION_LENGTH,
    );
    const clientInfo = parseClientInfo(options.clientInfo);
    const clientCapabilities = parseCapabilities(options.clientCapabilities);
    if (!protocolVersion || !clientInfo.ok || !clientCapabilities.ok) {
      return err(this.error("MCP server/discover request metadata is malformed or too large."));
    }
    if (this.nextRequestId > MAX_REQUEST_ID) {
      return err(this.error("MCP request identifier space is exhausted."));
    }

    const request = {
      jsonrpc: "2.0" as const,
      id: this.nextRequestId,
      method: "server/discover" as const,
      params: {
        _meta: {
          "io.modelcontextprotocol/protocolVersion": protocolVersion,
          "io.modelcontextprotocol/clientInfo": clientInfo.value,
          "io.modelcontextprotocol/clientCapabilities": clientCapabilities.value,
        },
      },
    };
    const serialized = safeJson(request);
    if (serialized === undefined || serialized.length > MAX_REQUEST_BYTES) {
      return err(this.error("MCP server/discover request is invalid or too large."));
    }

    this.nextRequestId += 1;
    return ok(JSON.parse(serialized) as McpServerDiscoverRequest);
  }

  private error(message: string): ErrorInfo {
    return { code: "NOVA-TL002", message, retryable: false };
  }
}

function parseClientInfo(value: unknown): Result<{ name: string; version: string }> {
  if (!isRecord(value)) return err(invalidMetadata());
  const name = parseBoundedString(value.name, MAX_CLIENT_INFO_FIELD_LENGTH);
  const version = parseBoundedString(value.version, MAX_CLIENT_INFO_FIELD_LENGTH);
  if (!name || !version) return err(invalidMetadata());
  return ok({ name, version });
}

function parseCapabilities(value: unknown): Result<Readonly<Record<string, unknown>>> {
  if (!isRecord(value) || Object.keys(value).length > MAX_CAPABILITY_KEYS) {
    return err(invalidMetadata());
  }
  const serialized = safeJson(value);
  if (serialized === undefined || serialized.length > MAX_REQUEST_BYTES) {
    return err(invalidMetadata());
  }
  return ok(JSON.parse(serialized) as Readonly<Record<string, unknown>>);
}

function parseBoundedString(value: unknown, maxLength: number): string | undefined {
  return typeof value === "string" && value.length > 0 && value.length <= maxLength
    ? value
    : undefined;
}

function invalidMetadata(): ErrorInfo {
  return {
    code: "NOVA-TL002",
    message: "MCP server/discover metadata is malformed or too large.",
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
