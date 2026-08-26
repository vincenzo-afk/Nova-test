import { err, ok, type ErrorInfo, type Result } from "@nova/shared";
import type { McpResourceContent, McpResourcesReadResult } from "./mcp-resources-read-response.js";

export interface McpResourceCacheOptions {
  readonly now?: () => number;
  readonly defaultTtlMs?: number;
}

export interface McpResourceCacheMiss {
  readonly server_id: string;
  readonly uri: string;
  readonly status: "miss";
}

type CacheLookup = McpResourcesReadResult | McpResourceCacheMiss;

interface CacheEntry {
  readonly result: McpResourcesReadResult;
  readonly expires_at: number;
}

const MAX_ENTRIES = 256;
const MAX_TTL_MS = 86_400_000;
const DEFAULT_TTL_MS = 300_000;
const MAX_CONTENTS = 128;
const MAX_URI_LENGTH = 2_048;
const MAX_MIME_TYPE_LENGTH = 128;
const MAX_TEXT_LENGTH = 1_048_576;
const MAX_BLOB_LENGTH = 4_194_304;
const SERVER_ID_PATTERN = /^[A-Za-z0-9_.-]{1,128}$/;

export class McpResourceCache {
  private readonly entries = new Map<string, CacheEntry>();
  private readonly now: () => number;
  private readonly defaultTtlMs: number;

  public constructor(options: McpResourceCacheOptions = {}) {
    this.now = options.now ?? (() => Date.now());
    this.defaultTtlMs = options.defaultTtlMs ?? DEFAULT_TTL_MS;
  }

  public put(serverId: string, result: McpResourcesReadResult): Result<void> {
    if (!isServerId(serverId) || !isResourceResult(result)) {
      return err(this.error("MCP resource cache entry is invalid."));
    }
    const ttlMs = result.ttl_ms ?? this.defaultTtlMs;
    if (!isPositiveBoundedInteger(ttlMs)) {
      return err(this.error("MCP resource cache TTL is invalid."));
    }

    const expiresAt = this.now() + ttlMs;
    const clonedResult = tryClone(result);
    if (clonedResult === undefined) {
      return err(this.error("MCP resource cache entry cannot be cloned safely."));
    }
    for (const content of result.contents) {
      const clonedEntry = tryClone(clonedResult);
      if (clonedEntry === undefined) {
        return err(this.error("MCP resource cache entry cannot be cloned safely."));
      }
      this.entries.set(cacheKey(serverId, content.uri), {
        result: clonedEntry,
        expires_at: expiresAt,
      });
    }
    while (this.entries.size > MAX_ENTRIES) {
      const oldest = this.entries.keys().next().value as string | undefined;
      if (oldest === undefined) break;
      this.entries.delete(oldest);
    }
    return ok(undefined);
  }

  public get(serverId: string, uri: string): Result<CacheLookup> {
    if (!isServerId(serverId) || !isSafeResourceUri(uri)) {
      return err(this.error("MCP resource cache lookup is invalid."));
    }
    const key = cacheKey(serverId, uri);
    const entry = this.entries.get(key);
    if (entry === undefined || this.now() >= entry.expires_at) {
      if (entry !== undefined) this.entries.delete(key);
      return ok({ server_id: serverId, uri, status: "miss" });
    }
    const cloned = tryClone(entry.result);
    if (cloned === undefined) {
      return err(this.error("MCP resource cache entry cannot be cloned safely."));
    }
    return ok(cloned);
  }

  public invalidate(serverId: string, uri: string): Result<void> {
    if (!isServerId(serverId) || !isSafeResourceUri(uri)) {
      return err(this.error("MCP resource cache invalidation is invalid."));
    }
    this.entries.delete(cacheKey(serverId, uri));
    return ok(undefined);
  }

  private error(message: string): ErrorInfo {
    return { code: "NOVA-CFG001", message, retryable: false };
  }
}

function isServerId(value: string): boolean {
  return SERVER_ID_PATTERN.test(value);
}

function isResourceResult(value: unknown): value is McpResourcesReadResult {
  if (
    !isRecord(value) ||
    !Array.isArray(value.contents) ||
    value.contents.length === 0 ||
    value.contents.length > MAX_CONTENTS ||
    !Array.isArray(value.rejected_content_uris) ||
    value.rejected_content_uris.length > MAX_CONTENTS ||
    !value.rejected_content_uris.every((uri) => isSafeResourceUri(uri))
  ) {
    return false;
  }
  if (value.ttl_ms !== undefined && !isPositiveBoundedInteger(value.ttl_ms)) {
    return false;
  }
  if (
    value.cache_scope !== undefined &&
    value.cache_scope !== "public" &&
    value.cache_scope !== "private"
  ) {
    return false;
  }
  const uris = new Set<string>();
  for (const content of value.contents) {
    if (!isResourceContent(content) || uris.has(content.uri)) return false;
    uris.add(content.uri);
  }
  return true;
}

function isResourceContent(value: unknown): value is McpResourceContent {
  if (!isRecord(value) || !isSafeResourceUri(value.uri)) return false;
  if (value.mime_type !== undefined && !isBoundedString(value.mime_type, MAX_MIME_TYPE_LENGTH)) {
    return false;
  }
  const hasText = typeof value.text === "string";
  const hasBlob = typeof value.blob_base64 === "string";
  if (hasText === hasBlob) return false;
  if (hasText && (value.text as string).length > MAX_TEXT_LENGTH) return false;
  return (
    !hasBlob ||
    ((value.blob_base64 as string).length <= MAX_BLOB_LENGTH &&
      isBase64(value.blob_base64 as string))
  );
}

function isSafeResourceUri(value: unknown): value is string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > MAX_URI_LENGTH ||
    /\s/.test(value)
  ) {
    return false;
  }
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

function isBase64(value: string): boolean {
  return (
    value.length % 4 === 0 &&
    /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)
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

function cacheKey(serverId: string, uri: string): string {
  return `${serverId}\u0000${uri}`;
}

function tryClone<T>(value: T): T | undefined {
  try {
    const serialized = JSON.stringify(value);
    return serialized === undefined ? undefined : (JSON.parse(serialized) as T);
  } catch {
    return undefined;
  }
}
