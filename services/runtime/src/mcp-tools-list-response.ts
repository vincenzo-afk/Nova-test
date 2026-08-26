import { err, ok, type ErrorInfo, type Result } from "@nova/shared";
import type { McpToolAdvertisement } from "./mcp-tool-discovery.js";

export interface McpToolsListResult {
  readonly tools: readonly McpToolAdvertisement[];
  readonly next_cursor?: string;
  readonly ttl_ms?: number;
  readonly cache_scope?: "public" | "private";
  readonly rejected_tool_names: readonly string[];
}

const MAX_TOOLS = 128;
const MAX_TOOL_NAME_LENGTH = 128;
const MAX_DESCRIPTION_LENGTH = 2_048;
const MAX_CURSOR_LENGTH = 256;
const MAX_TTL_MS = 86_400_000;
const MAX_SCHEMA_BYTES = 131_072;
const VALID_SCHEMA_TYPES = new Set([
  "array",
  "boolean",
  "integer",
  "null",
  "number",
  "object",
  "string",
]);

export class McpToolsListResponseValidator {
  public parse(response: unknown, expectedId: string | number): Result<McpToolsListResult> {
    if (!isRecord(response) || response.jsonrpc !== "2.0" || response.id !== expectedId) {
      return err(this.error("MCP tools/list response correlation is invalid."));
    }
    if ("error" in response || !isRecord(response.result)) {
      return err(this.error("MCP tools/list response is not a successful result."));
    }
    const rawTools = response.result.tools;
    if (!Array.isArray(rawTools) || rawTools.length > MAX_TOOLS) {
      return err(this.error("MCP tools/list result is missing a bounded tool list."));
    }

    const tools: McpToolAdvertisement[] = [];
    const rejectedToolNames: string[] = [];
    const names = new Set<string>();
    for (const rawTool of rawTools) {
      const parsed = parseTool(rawTool);
      if (!parsed.ok || names.has(parsed.value.name)) {
        rejectedToolNames.push(rejectedName(rawTool));
        continue;
      }
      names.add(parsed.value.name);
      tools.push(parsed.value);
    }

    const pagination = parsePagination(response.result);
    if (!pagination.ok) return pagination;
    return ok({
      tools,
      ...pagination.value,
      rejected_tool_names: rejectedToolNames.slice(0, MAX_TOOLS),
    });
  }

  private error(message: string): ErrorInfo {
    return { code: "NOVA-TL002", message, retryable: false };
  }
}

function parseTool(value: unknown): Result<McpToolAdvertisement> {
  if (!isRecord(value)) return err(invalidAdvertisement());
  if (
    typeof value.name !== "string" ||
    value.name.length === 0 ||
    value.name.length > MAX_TOOL_NAME_LENGTH ||
    !/^[A-Za-z0-9_.-]+$/.test(value.name) ||
    !isBoundedSchema(value.inputSchema) ||
    !isJsonSchema(value.inputSchema)
  ) {
    return err(invalidAdvertisement());
  }
  if (value.description !== undefined) {
    if (typeof value.description !== "string" || value.description.length > MAX_DESCRIPTION_LENGTH)
      return err(invalidAdvertisement());
  }
  if (
    value.outputSchema !== undefined &&
    (!isBoundedSchema(value.outputSchema) || !isJsonSchema(value.outputSchema))
  ) {
    return err(invalidAdvertisement());
  }
  return ok({
    name: value.name,
    ...(value.description === undefined ? {} : { description: value.description }),
    inputSchema: cloneRecord(value.inputSchema),
    ...(value.outputSchema === undefined ? {} : { outputSchema: cloneRecord(value.outputSchema) }),
  });
}

function parsePagination(
  result: Readonly<Record<string, unknown>>,
): Result<Pick<McpToolsListResult, "next_cursor" | "ttl_ms" | "cache_scope">> {
  if (result.nextCursor !== undefined) {
    if (typeof result.nextCursor !== "string" || result.nextCursor.length > MAX_CURSOR_LENGTH)
      return err(invalidAdvertisement());
  }
  if (result.ttlMs !== undefined) {
    if (
      typeof result.ttlMs !== "number" ||
      !Number.isInteger(result.ttlMs) ||
      result.ttlMs <= 0 ||
      result.ttlMs > MAX_TTL_MS
    )
      return err(invalidAdvertisement());
  }
  if (
    result.cacheScope !== undefined &&
    result.cacheScope !== "public" &&
    result.cacheScope !== "private"
  )
    return err(invalidAdvertisement());
  return ok({
    ...(result.nextCursor === undefined ? {} : { next_cursor: result.nextCursor }),
    ...(result.ttlMs === undefined ? {} : { ttl_ms: result.ttlMs }),
    ...(result.cacheScope === undefined ? {} : { cache_scope: result.cacheScope }),
  });
}

function isBoundedSchema(value: unknown): value is Readonly<Record<string, unknown>> {
  if (!isRecord(value)) return false;
  try {
    const serialized = JSON.stringify(value);
    return serialized !== undefined && serialized.length <= MAX_SCHEMA_BYTES;
  } catch {
    return false;
  }
}

function isJsonSchema(value: unknown): value is Readonly<Record<string, unknown>> {
  if (!isRecord(value)) return false;
  if (value.type !== undefined) {
    if (typeof value.type === "string") {
      if (!VALID_SCHEMA_TYPES.has(value.type)) return false;
    } else if (
      !Array.isArray(value.type) ||
      value.type.length === 0 ||
      !value.type.every((type) => typeof type === "string" && VALID_SCHEMA_TYPES.has(type))
    ) {
      return false;
    }
  }
  if (value.properties !== undefined && !isRecord(value.properties)) return false;
  if (
    value.required !== undefined &&
    (!Array.isArray(value.required) || !value.required.every((item) => typeof item === "string"))
  )
    return false;
  if (value.items !== undefined && !isJsonSchema(value.items)) return false;
  if (
    value.additionalProperties !== undefined &&
    typeof value.additionalProperties !== "boolean" &&
    !isJsonSchema(value.additionalProperties)
  )
    return false;
  return true;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cloneRecord(value: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>> {
  return JSON.parse(JSON.stringify(value)) as Readonly<Record<string, unknown>>;
}

function rejectedName(value: unknown): string {
  if (!isRecord(value) || typeof value.name !== "string" || value.name.length === 0) {
    return "<unnamed>";
  }
  return value.name.slice(0, MAX_TOOL_NAME_LENGTH);
}

function invalidAdvertisement(): ErrorInfo {
  return {
    code: "NOVA-TL002",
    message: "MCP tool advertisement is malformed.",
    retryable: false,
  };
}
