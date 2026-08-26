import { err, ok, type ErrorInfo, type Result } from "@nova/shared";
import type { McpServerDiscoverResult } from "./mcp-server-discover-response.js";

export interface McpServerDiscoveryCacheOptions {
  readonly now?: () => number;
  readonly defaultTtlMs?: number;
}

export interface McpServerDiscoveryCacheMiss {
  readonly server_id: string;
  readonly status: "miss";
}

type CacheLookup = McpServerDiscoverResult | McpServerDiscoveryCacheMiss;

interface CacheEntry {
  readonly result: McpServerDiscoverResult;
  readonly expires_at: number;
}

const MAX_ENTRIES = 128;
const MAX_SUPPORTED_VERSIONS = 64;
const MAX_PROTOCOL_VERSION_LENGTH = 64;
const MAX_CAPABILITY_KEYS = 64;
const MAX_CAPABILITY_BYTES = 65_536;
const MAX_SERVER_INFO_FIELD_LENGTH = 256;
const MAX_INSTRUCTIONS_LENGTH = 8_192;
const MAX_TTL_MS = 86_400_000;
const MAX_RESPONSE_BYTES = 131_072;
const DEFAULT_TTL_MS = 300_000;
const SERVER_ID_PATTERN = /^[A-Za-z0-9_.-]{1,128}$/;

export class McpServerDiscoveryCache {
  private readonly entries = new Map<string, CacheEntry>();
  private readonly now: () => number;
  private readonly defaultTtlMs: number;

  public constructor(options: McpServerDiscoveryCacheOptions = {}) {
    this.now = options.now ?? (() => Date.now());
    this.defaultTtlMs = options.defaultTtlMs ?? DEFAULT_TTL_MS;
  }

  public put(serverId: string, result: McpServerDiscoverResult): Result<void> {
    if (!isServerId(serverId) || !isDiscoveryResult(result)) {
      return err(this.error("MCP server discovery cache entry is invalid."));
    }
    const ttlMs = result.ttl_ms ?? this.defaultTtlMs;
    if (!isPositiveBoundedInteger(ttlMs)) {
      return err(this.error("MCP server discovery cache TTL is invalid."));
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

function isDiscoveryResult(value: unknown): value is McpServerDiscoverResult {
  if (!isRecord(value)) return false;
  if (
    !Array.isArray(value.supported_versions) ||
    value.supported_versions.length === 0 ||
    value.supported_versions.length > MAX_SUPPORTED_VERSIONS ||
    !value.supported_versions.every(
      (version) =>
        typeof version === "string" &&
        version.length > 0 &&
        version.length <= MAX_PROTOCOL_VERSION_LENGTH,
    )
  ) {
    return false;
  }
  if (
    new Set(value.supported_versions).size !== value.supported_versions.length ||
    !isRecord(value.capabilities) ||
    Object.keys(value.capabilities).length > MAX_CAPABILITY_KEYS
  ) {
    return false;
  }
  const capabilitiesJson = safeJson(value.capabilities);
  if (capabilitiesJson === undefined || capabilitiesJson.length > MAX_CAPABILITY_BYTES) {
    return false;
  }
  if (value.server_info !== undefined) {
    if (
      !isRecord(value.server_info) ||
      !isNonEmptyBoundedString(value.server_info.name, MAX_SERVER_INFO_FIELD_LENGTH) ||
      !isNonEmptyBoundedString(value.server_info.version, MAX_SERVER_INFO_FIELD_LENGTH)
    ) {
      return false;
    }
  }
  if (
    value.instructions !== undefined &&
    !isNonEmptyBoundedString(value.instructions, MAX_INSTRUCTIONS_LENGTH)
  ) {
    return false;
  }
  if (value.ttl_ms !== undefined && !isPositiveBoundedInteger(value.ttl_ms)) return false;
  if (
    value.cache_scope !== undefined &&
    value.cache_scope !== "public" &&
    value.cache_scope !== "private"
  ) {
    return false;
  }
  const serialized = safeJson(value);
  return serialized !== undefined && serialized.length <= MAX_RESPONSE_BYTES;
}

function isNonEmptyBoundedString(value: unknown, maxLength: number): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= maxLength;
}

function isPositiveBoundedInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0 && value <= MAX_TTL_MS;
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

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
