import { err, ok, type ErrorInfo, type Result } from "@nova/shared";
import type {
  McpResourceAdvertisement,
  McpResourcesListResult,
} from "./mcp-resources-list-response.js";

export interface McpResourceListCacheOptions {
  readonly now?: () => number;
  readonly defaultTtlMs?: number;
}

export interface McpResourceListCacheMiss {
  readonly server_id: string;
  readonly status: "miss";
}

type CacheLookup = McpResourcesListResult | McpResourceListCacheMiss;

interface CacheEntry {
  readonly result: McpResourcesListResult;
  readonly expires_at: number;
}

const MAX_ENTRIES = 128;
const MAX_RESOURCES = 128;
const MAX_URI_LENGTH = 2_048;
const MAX_NAME_LENGTH = 256;
const MAX_DESCRIPTION_LENGTH = 2_048;
const MAX_MIME_TYPE_LENGTH = 128;
const MAX_CURSOR_LENGTH = 256;
const MAX_TTL_MS = 86_400_000;
const MAX_RESOURCE_SIZE_BYTES = Number.MAX_SAFE_INTEGER;
const DEFAULT_TTL_MS = 300_000;
const SERVER_ID_PATTERN = /^[A-Za-z0-9_.-]{1,128}$/;

export class McpResourceListCache {
  private readonly entries = new Map<string, CacheEntry>();
  private readonly now: () => number;
  private readonly defaultTtlMs: number;

  public constructor(options: McpResourceListCacheOptions = {}) {
    this.now = options.now ?? (() => Date.now());
    this.defaultTtlMs = options.defaultTtlMs ?? DEFAULT_TTL_MS;
  }

  public put(serverId: string, result: McpResourcesListResult): Result<void> {
    if (!isServerId(serverId) || !isResourceList(result)) {
      return err(this.error("MCP resource-list cache entry is invalid."));
    }
    const ttlMs = result.ttl_ms ?? this.defaultTtlMs;
    if (!isPositiveBoundedInteger(ttlMs)) {
      return err(this.error("MCP resource-list cache TTL is invalid."));
    }
    const cloned = tryClone(result);
    if (cloned === undefined) {
      return err(this.error("MCP resource-list cache entry cannot be cloned safely."));
    }
    this.entries.set(serverId, {
      result: cloned,
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
    const cloned = tryClone(entry.result);
    if (cloned === undefined) {
      return err(this.error("MCP resource-list cache entry cannot be cloned safely."));
    }
    return ok(cloned);
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

function isServerId(value: unknown): value is string {
  return typeof value === "string" && SERVER_ID_PATTERN.test(value);
}

function isResourceList(value: unknown): value is McpResourcesListResult {
  if (
    !isRecord(value) ||
    !Array.isArray(value.resources) ||
    value.resources.length > MAX_RESOURCES ||
    !Array.isArray(value.rejected_resource_uris) ||
    value.rejected_resource_uris.length > MAX_RESOURCES
  ) {
    return false;
  }
  if (!value.rejected_resource_uris.every((uri) => isSafeResourceUri(uri))) {
    return false;
  }
  const uris = new Set<string>();
  for (const resource of value.resources) {
    if (!isResourceAdvertisement(resource) || uris.has(resource.uri)) return false;
    uris.add(resource.uri);
  }
  if (value.next_cursor !== undefined && !isBoundedString(value.next_cursor, MAX_CURSOR_LENGTH)) {
    return false;
  }
  if (value.ttl_ms !== undefined && !isPositiveBoundedInteger(value.ttl_ms)) return false;
  return (
    value.cache_scope === undefined ||
    value.cache_scope === "public" ||
    value.cache_scope === "private"
  );
}

function isResourceAdvertisement(value: unknown): value is McpResourceAdvertisement {
  return (
    isRecord(value) &&
    isSafeResourceUri(value.uri) &&
    typeof value.name === "string" &&
    value.name.trim().length > 0 &&
    value.name.length <= MAX_NAME_LENGTH &&
    (value.title === undefined || isBoundedString(value.title, MAX_NAME_LENGTH)) &&
    (value.description === undefined ||
      isBoundedString(value.description, MAX_DESCRIPTION_LENGTH)) &&
    (value.mime_type === undefined || isBoundedString(value.mime_type, MAX_MIME_TYPE_LENGTH)) &&
    (value.size_bytes === undefined || isResourceSize(value.size_bytes))
  );
}

function isSafeResourceUri(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0 || value.length > MAX_URI_LENGTH) {
    return false;
  }
  if (/\s/.test(value)) return false;
  try {
    const url = new URL(value);
    if (!url.protocol || url.username !== "" || url.password !== "") return false;
    return !(
      url.protocol === "file:" && /(?:^|\/)\.\.(?:\/|$)/.test(value.slice(value.indexOf(":") + 1))
    );
  } catch {
    return false;
  }
}

function isResourceSize(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0 &&
    value <= MAX_RESOURCE_SIZE_BYTES
  );
}

function isBoundedString(value: unknown, maxLength: number): value is string {
  return typeof value === "string" && value.length <= maxLength;
}

function isPositiveBoundedInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0 && value <= MAX_TTL_MS;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function tryClone<T>(value: T): T | undefined {
  try {
    const serialized = JSON.stringify(value);
    return serialized === undefined ? undefined : (JSON.parse(serialized) as T);
  } catch {
    return undefined;
  }
}
