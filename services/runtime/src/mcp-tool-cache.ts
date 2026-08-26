import { err, ok, type ErrorInfo, type Result } from "@nova/shared";
import type { McpToolsListResult } from "./mcp-tools-list-response.js";

export interface McpToolCacheOptions {
  readonly now?: () => number;
  readonly defaultTtlMs?: number;
}

export interface McpToolCacheMiss {
  readonly server_id: string;
  readonly status: "miss";
}

type CacheLookup = McpToolsListResult | McpToolCacheMiss;

interface CacheEntry {
  readonly result: McpToolsListResult;
  readonly expires_at: number;
}

const MAX_ENTRIES = 128;
const MAX_TOOLS = 128;
const MAX_TTL_MS = 86_400_000;
const DEFAULT_TTL_MS = 300_000;
const MAX_TOOL_NAME_LENGTH = 128;
const MAX_CURSOR_LENGTH = 256;
const SERVER_ID_PATTERN = /^[A-Za-z0-9_.-]{1,128}$/;
const TOOL_NAME_PATTERN = /^[A-Za-z0-9_.-]+$/;

export class McpToolCache {
  private readonly entries = new Map<string, CacheEntry>();
  private readonly now: () => number;
  private readonly defaultTtlMs: number;

  public constructor(options: McpToolCacheOptions = {}) {
    this.now = options.now ?? (() => Date.now());
    this.defaultTtlMs = options.defaultTtlMs ?? DEFAULT_TTL_MS;
  }

  public put(serverId: string, result: McpToolsListResult): Result<void> {
    if (!isServerId(serverId) || !isToolList(result)) {
      return err(this.error("MCP tool cache entry is invalid."));
    }
    const ttlMs = result.ttl_ms ?? this.defaultTtlMs;
    if (!isPositiveBoundedInteger(ttlMs)) {
      return err(this.error("MCP tool cache TTL is invalid."));
    }
    this.entries.set(serverId, {
      result: clone(result),
      expires_at: this.now() + ttlMs,
    });
    while (this.entries.size > MAX_ENTRIES) {
      const oldest = this.entries.keys().next().value as string | undefined;
      if (oldest === undefined) break;
      this.entries.delete(oldest);
    }
    return ok(undefined);
  }

  public get(serverId: string): Result<CacheLookup> {
    if (!isServerId(serverId)) return err(this.error("MCP server id is invalid."));
    const entry = this.entries.get(serverId);
    if (entry === undefined || this.now() >= entry.expires_at) {
      if (entry !== undefined) this.entries.delete(serverId);
      return ok({ server_id: serverId, status: "miss" });
    }
    return ok(clone(entry.result));
  }

  public invalidate(serverId: string): Result<void> {
    if (!isServerId(serverId)) return err(this.error("MCP server id is invalid."));
    this.entries.delete(serverId);
    return ok(undefined);
  }

  private error(message: string): ErrorInfo {
    return { code: "NOVA-CFG001", message, retryable: false };
  }
}

function isServerId(value: string): boolean {
  return SERVER_ID_PATTERN.test(value);
}

function isToolList(value: unknown): value is McpToolsListResult {
  if (
    !isRecord(value) ||
    !Array.isArray(value.tools) ||
    value.tools.length > MAX_TOOLS ||
    !Array.isArray(value.rejected_tool_names) ||
    value.rejected_tool_names.length > MAX_TOOLS
  ) {
    return false;
  }
  if (!value.tools.every(isToolAdvertisement)) return false;
  if (!value.rejected_tool_names.every(isSafeToolName)) return false;
  if (
    value.next_cursor !== undefined &&
    (typeof value.next_cursor !== "string" || value.next_cursor.length > MAX_CURSOR_LENGTH)
  ) {
    return false;
  }
  if (value.ttl_ms !== undefined && !isPositiveBoundedInteger(value.ttl_ms)) return false;
  return (
    value.cache_scope === undefined ||
    value.cache_scope === "public" ||
    value.cache_scope === "private"
  );
}

function isSafeToolName(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= MAX_TOOL_NAME_LENGTH &&
    TOOL_NAME_PATTERN.test(value)
  );
}

function isToolAdvertisement(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.name === "string" &&
    isRecord(value.inputSchema) &&
    (value.description === undefined || typeof value.description === "string") &&
    (value.outputSchema === undefined || isRecord(value.outputSchema))
  );
}

function isPositiveBoundedInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0 && value <= MAX_TTL_MS;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
