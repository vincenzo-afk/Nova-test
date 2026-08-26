import { err, ok, type ErrorInfo, type Result } from "@nova/shared";

export interface McpServerDiscoverResult {
  readonly supported_versions: readonly string[];
  readonly capabilities: Readonly<Record<string, unknown>>;
  readonly server_info?: {
    readonly name: string;
    readonly version: string;
  };
  readonly instructions?: string;
  readonly ttl_ms?: number;
  readonly cache_scope?: "public" | "private";
}

const MAX_RESPONSE_BYTES = 131_072;
const MAX_REQUEST_ID_LENGTH = 256;
const MAX_SUPPORTED_VERSIONS = 64;
const MAX_PROTOCOL_VERSION_LENGTH = 64;
const MAX_CAPABILITY_KEYS = 64;
const MAX_CAPABILITY_BYTES = 65_536;
const MAX_SERVER_INFO_FIELD_LENGTH = 256;
const MAX_INSTRUCTIONS_LENGTH = 8_192;
const MAX_TTL_MS = 86_400_000;

export class McpServerDiscoverResponseValidator {
  public parse(response: unknown, expectedId: string | number): Result<McpServerDiscoverResult> {
    const serialized = safeJson(response);
    if (serialized === undefined || serialized.length > MAX_RESPONSE_BYTES) {
      return err(this.error("MCP server/discover response is invalid or too large."));
    }
    if (
      !isRecord(response) ||
      response.jsonrpc !== "2.0" ||
      !isRequestId(response.id) ||
      !isRequestId(expectedId) ||
      response.id !== expectedId
    ) {
      return err(this.error("MCP server/discover response correlation is invalid."));
    }
    if ("error" in response || !isRecord(response.result)) {
      return err(this.error("MCP server/discover response is not a successful result."));
    }
    if (response.result.resultType !== "complete") {
      return err(this.error("MCP server/discover result type is malformed."));
    }

    const supportedVersions = parseSupportedVersions(response.result.supportedVersions);
    const capabilities = parseCapabilities(response.result.capabilities);
    const serverInfo = parseServerInfo(response.result._meta);
    const instructions = parseInstructions(response.result.instructions);
    const cache = parseCache(response.result);
    if (
      !supportedVersions.ok ||
      !capabilities.ok ||
      !serverInfo.ok ||
      !instructions.ok ||
      !cache.ok
    ) {
      return err(this.error("MCP server/discover result metadata is malformed or too large."));
    }

    return ok({
      supported_versions: supportedVersions.value,
      capabilities: capabilities.value,
      ...(serverInfo.value === undefined ? {} : { server_info: serverInfo.value }),
      ...(instructions.value === undefined ? {} : { instructions: instructions.value }),
      ...cache.value,
    });
  }

  private error(message: string): ErrorInfo {
    return { code: "NOVA-TL002", message, retryable: false };
  }
}

function parseSupportedVersions(value: unknown): Result<readonly string[]> {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_SUPPORTED_VERSIONS) {
    return err(invalidResult());
  }
  const versions: string[] = [];
  const seen = new Set<string>();
  for (const version of value) {
    if (
      typeof version !== "string" ||
      version.length === 0 ||
      version.length > MAX_PROTOCOL_VERSION_LENGTH ||
      seen.has(version)
    ) {
      return err(invalidResult());
    }
    seen.add(version);
    versions.push(version);
  }
  return ok(versions);
}

function parseCapabilities(value: unknown): Result<Readonly<Record<string, unknown>>> {
  if (!isRecord(value) || Object.keys(value).length > MAX_CAPABILITY_KEYS) {
    return err(invalidResult());
  }
  const serialized = safeJson(value);
  if (serialized === undefined || serialized.length > MAX_CAPABILITY_BYTES) {
    return err(invalidResult());
  }
  return ok(JSON.parse(serialized) as Readonly<Record<string, unknown>>);
}

function parseServerInfo(
  metadata: unknown,
): Result<{ readonly name: string; readonly version: string } | undefined> {
  if (metadata === undefined) return ok(undefined);
  if (!isRecord(metadata)) return err(invalidResult());
  const value = metadata["io.modelcontextprotocol/serverInfo"];
  if (value === undefined) return ok(undefined);
  if (!isRecord(value)) return err(invalidResult());
  if (
    !isBoundedString(value.name, MAX_SERVER_INFO_FIELD_LENGTH) ||
    !isBoundedString(value.version, MAX_SERVER_INFO_FIELD_LENGTH)
  ) {
    return err(invalidResult());
  }
  return ok({ name: value.name, version: value.version });
}

function parseInstructions(value: unknown): Result<string | undefined> {
  if (value === undefined) return ok(undefined);
  return isBoundedString(value, MAX_INSTRUCTIONS_LENGTH) ? ok(value) : err(invalidResult());
}

function parseCache(
  result: Readonly<Record<string, unknown>>,
): Result<Pick<McpServerDiscoverResult, "ttl_ms" | "cache_scope">> {
  if (result.ttlMs !== undefined) {
    if (
      typeof result.ttlMs !== "number" ||
      !Number.isInteger(result.ttlMs) ||
      result.ttlMs <= 0 ||
      result.ttlMs > MAX_TTL_MS
    ) {
      return err(invalidResult());
    }
  }
  if (
    result.cacheScope !== undefined &&
    result.cacheScope !== "public" &&
    result.cacheScope !== "private"
  ) {
    return err(invalidResult());
  }
  return ok({
    ...(result.ttlMs === undefined ? {} : { ttl_ms: result.ttlMs }),
    ...(result.cacheScope === undefined ? {} : { cache_scope: result.cacheScope }),
  });
}

function isRequestId(value: unknown): value is string | number {
  return (
    (typeof value === "string" && value.length > 0 && value.length <= MAX_REQUEST_ID_LENGTH) ||
    (typeof value === "number" && Number.isSafeInteger(value))
  );
}

function isBoundedString(value: unknown, maxLength: number): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= maxLength;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function invalidResult(): ErrorInfo {
  return {
    code: "NOVA-TL002",
    message: "MCP server/discover result is malformed.",
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
