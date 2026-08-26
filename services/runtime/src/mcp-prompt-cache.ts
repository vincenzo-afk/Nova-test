import { err, ok, type ErrorInfo, type Result } from "@nova/shared";
import type { McpPromptAdvertisement, McpPromptsListResult } from "./mcp-prompts-list-response.js";

export interface McpPromptCacheOptions {
  readonly now?: () => number;
  readonly defaultTtlMs?: number;
}

export interface McpPromptCacheMiss {
  readonly server_id: string;
  readonly status: "miss";
}

type CacheLookup = McpPromptsListResult | McpPromptCacheMiss;

interface CacheEntry {
  readonly result: McpPromptsListResult;
  readonly expires_at: number;
}

const MAX_ENTRIES = 128;
const MAX_PROMPTS = 128;
const MAX_ARGUMENTS = 32;
const MAX_NAME_LENGTH = 128;
const MAX_DESCRIPTION_LENGTH = 2_048;
const MAX_CURSOR_LENGTH = 256;
const MAX_TTL_MS = 86_400_000;
const DEFAULT_TTL_MS = 300_000;
const IDENTIFIER_PATTERN = /^[A-Za-z0-9_.-]+$/;
const SERVER_ID_PATTERN = /^[A-Za-z0-9_.-]{1,128}$/;

export class McpPromptCache {
  private readonly entries = new Map<string, CacheEntry>();
  private readonly now: () => number;
  private readonly defaultTtlMs: number;

  public constructor(options: McpPromptCacheOptions = {}) {
    this.now = options.now ?? (() => Date.now());
    this.defaultTtlMs = options.defaultTtlMs ?? DEFAULT_TTL_MS;
  }

  public put(serverId: string, result: McpPromptsListResult): Result<void> {
    if (!isServerId(serverId) || !isPromptList(result)) {
      return err(this.error("MCP prompt cache entry is invalid."));
    }
    const ttlMs = result.ttl_ms ?? this.defaultTtlMs;
    if (!isPositiveBoundedInteger(ttlMs)) {
      return err(this.error("MCP prompt cache TTL is invalid."));
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

function isPromptList(value: unknown): value is McpPromptsListResult {
  if (
    !isRecord(value) ||
    !Array.isArray(value.prompts) ||
    value.prompts.length > MAX_PROMPTS ||
    !Array.isArray(value.rejected_prompt_names)
  ) {
    return false;
  }
  if (!value.rejected_prompt_names.every((name) => isBoundedString(name, MAX_NAME_LENGTH))) {
    return false;
  }
  const names = new Set<string>();
  for (const prompt of value.prompts) {
    if (!isPromptAdvertisement(prompt) || names.has(prompt.name)) return false;
    names.add(prompt.name);
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

function isPromptAdvertisement(value: unknown): value is McpPromptAdvertisement {
  if (
    !isRecord(value) ||
    !isIdentifier(value.name) ||
    (value.title !== undefined && !isBoundedString(value.title, MAX_NAME_LENGTH)) ||
    (value.description !== undefined && !isBoundedString(value.description, MAX_DESCRIPTION_LENGTH))
  ) {
    return false;
  }
  if (value.arguments === undefined) return true;
  if (!Array.isArray(value.arguments) || value.arguments.length > MAX_ARGUMENTS) return false;
  const names = new Set<string>();
  return value.arguments.every((argument) => {
    if (
      !isRecord(argument) ||
      !isIdentifier(argument.name) ||
      names.has(argument.name) ||
      (argument.title !== undefined && !isBoundedString(argument.title, MAX_NAME_LENGTH)) ||
      (argument.description !== undefined &&
        !isBoundedString(argument.description, MAX_DESCRIPTION_LENGTH)) ||
      (argument.required !== undefined && typeof argument.required !== "boolean")
    ) {
      return false;
    }
    names.add(argument.name);
    return true;
  });
}

function isIdentifier(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= MAX_NAME_LENGTH &&
    IDENTIFIER_PATTERN.test(value)
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

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
