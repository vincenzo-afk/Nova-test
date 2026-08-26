import { err, ok, type ErrorInfo, type Result } from "@nova/shared";
import type {
  McpResourceTemplateAdvertisement,
  McpResourcesTemplatesListResult,
} from "./mcp-resources-templates-list-response.js";

export interface McpResourceTemplatesListCacheOptions {
  readonly now?: () => number;
  readonly defaultTtlMs?: number;
}

export interface McpResourceTemplatesListCacheMiss {
  readonly server_id: string;
  readonly status: "miss";
}

type CacheLookup = McpResourcesTemplatesListResult | McpResourceTemplatesListCacheMiss;

interface CacheEntry {
  readonly result: McpResourcesTemplatesListResult;
  readonly expires_at: number;
}

const MAX_ENTRIES = 128;
const MAX_TEMPLATES = 128;
const MAX_URI_TEMPLATE_LENGTH = 2_048;
const MAX_NAME_LENGTH = 256;
const MAX_DESCRIPTION_LENGTH = 2_048;
const MAX_MIME_TYPE_LENGTH = 128;
const MAX_CURSOR_LENGTH = 256;
const MAX_TTL_MS = 86_400_000;
const DEFAULT_TTL_MS = 300_000;
const SERVER_ID_PATTERN = /^[A-Za-z0-9_.-]{1,128}$/;
const TEMPLATE_VARIABLE =
  /\{[+#./;?&]?[A-Za-z][A-Za-z0-9_.-]*(?:,(?:[A-Za-z][A-Za-z0-9_.-]*))*\*?(?::\d+)?\}/g;

export class McpResourceTemplatesListCache {
  private readonly entries = new Map<string, CacheEntry>();
  private readonly now: () => number;
  private readonly defaultTtlMs: number;

  public constructor(options: McpResourceTemplatesListCacheOptions = {}) {
    this.now = options.now ?? (() => Date.now());
    this.defaultTtlMs = options.defaultTtlMs ?? DEFAULT_TTL_MS;
  }

  public put(serverId: string, result: McpResourcesTemplatesListResult): Result<void> {
    if (!isServerId(serverId) || !isTemplateList(result)) {
      return err(this.error("MCP resource-template cache entry is invalid."));
    }
    const ttlMs = result.ttl_ms ?? this.defaultTtlMs;
    if (!isPositiveBoundedInteger(ttlMs)) {
      return err(this.error("MCP resource-template cache TTL is invalid."));
    }
    const cloned = tryClone(result);
    if (cloned === undefined) {
      return err(this.error("MCP resource-template cache entry cannot be cloned safely."));
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
      return err(this.error("MCP resource-template cache entry cannot be cloned safely."));
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

function isServerId(value: string): boolean {
  return SERVER_ID_PATTERN.test(value);
}

function isTemplateList(value: unknown): value is McpResourcesTemplatesListResult {
  if (
    !isRecord(value) ||
    !Array.isArray(value.resource_templates) ||
    value.resource_templates.length > MAX_TEMPLATES ||
    !Array.isArray(value.rejected_template_names) ||
    value.rejected_template_names.length > MAX_TEMPLATES
  ) {
    return false;
  }
  if (
    !value.rejected_template_names.every((name) => isNonEmptyBoundedString(name, MAX_NAME_LENGTH))
  ) {
    return false;
  }
  const names = new Set<string>();
  const uriTemplates = new Set<string>();
  for (const template of value.resource_templates) {
    if (
      !isTemplateAdvertisement(template) ||
      names.has(template.name) ||
      uriTemplates.has(template.uri_template)
    ) {
      return false;
    }
    names.add(template.name);
    uriTemplates.add(template.uri_template);
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

function isTemplateAdvertisement(value: unknown): value is McpResourceTemplateAdvertisement {
  return (
    isRecord(value) &&
    isSafeUriTemplate(value.uri_template) &&
    typeof value.name === "string" &&
    value.name.trim().length > 0 &&
    value.name.length <= MAX_NAME_LENGTH &&
    (value.title === undefined || isBoundedString(value.title, MAX_NAME_LENGTH)) &&
    (value.description === undefined ||
      isBoundedString(value.description, MAX_DESCRIPTION_LENGTH)) &&
    (value.mime_type === undefined || isBoundedString(value.mime_type, MAX_MIME_TYPE_LENGTH))
  );
}

function isSafeUriTemplate(value: unknown): value is string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > MAX_URI_TEMPLATE_LENGTH ||
    /\s/.test(value) ||
    /(?:^|\/)\.\.(?:\/|$)/.test(value) ||
    !/^[A-Za-z][A-Za-z0-9+.-]*:/.test(value)
  ) {
    return false;
  }
  const withoutTemplates = value.replace(TEMPLATE_VARIABLE, "");
  if (/[{}]/.test(withoutTemplates)) return false;
  const concreteUri = value.replace(TEMPLATE_VARIABLE, "x");
  try {
    const url = new URL(concreteUri);
    return url.username === "" && url.password === "";
  } catch {
    return false;
  }
}

function isBoundedString(value: unknown, maxLength: number): value is string {
  return typeof value === "string" && value.length <= maxLength;
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

function tryClone<T>(value: T): T | undefined {
  try {
    const serialized = JSON.stringify(value);
    return serialized === undefined ? undefined : (JSON.parse(serialized) as T);
  } catch {
    return undefined;
  }
}
