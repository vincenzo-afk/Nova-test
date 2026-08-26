import { err, ok, type ErrorInfo, type Result } from "@nova/shared";

export interface McpResourceAdvertisement {
  readonly uri: string;
  readonly name: string;
  readonly title?: string;
  readonly description?: string;
  readonly mime_type?: string;
  readonly size_bytes?: number;
}

export interface McpResourcesListResult {
  readonly resources: readonly McpResourceAdvertisement[];
  readonly next_cursor?: string;
  readonly ttl_ms?: number;
  readonly cache_scope?: "public" | "private";
  readonly rejected_resource_uris: readonly string[];
}

const MAX_RESPONSE_BYTES = 1_048_576;
const MAX_RESOURCES = 128;
const MAX_URI_LENGTH = 2_048;
const MAX_NAME_LENGTH = 256;
const MAX_DESCRIPTION_LENGTH = 2_048;
const MAX_MIME_TYPE_LENGTH = 128;
const MAX_CURSOR_LENGTH = 256;
const MAX_TTL_MS = 86_400_000;
const MAX_RESOURCE_SIZE_BYTES = Number.MAX_SAFE_INTEGER;

export class McpResourcesListResponseValidator {
  public parse(response: unknown, expectedId: string | number): Result<McpResourcesListResult> {
    const serialized = safeJson(response);
    if (serialized === undefined || serialized.length > MAX_RESPONSE_BYTES) {
      return err(this.error("MCP resources/list response is invalid or too large."));
    }
    if (!isRecord(response) || response.jsonrpc !== "2.0" || response.id !== expectedId) {
      return err(this.error("MCP resources/list response correlation is invalid."));
    }
    if ("error" in response || !isRecord(response.result)) {
      return err(this.error("MCP resources/list response is not a successful result."));
    }
    const rawResources = response.result.resources;
    if (!Array.isArray(rawResources) || rawResources.length > MAX_RESOURCES) {
      return err(this.error("MCP resources/list result is missing a bounded resource list."));
    }

    const resources: McpResourceAdvertisement[] = [];
    const rejectedResourceUris: string[] = [];
    const uris = new Set<string>();
    for (const rawResource of rawResources) {
      const parsed = parseResource(rawResource);
      if (!parsed.ok || uris.has(parsed.value.uri)) {
        rejectedResourceUris.push(rejectedUri(rawResource));
        continue;
      }
      uris.add(parsed.value.uri);
      resources.push(parsed.value);
    }

    const pagination = parsePagination(response.result);
    if (!pagination.ok) return pagination;
    return ok({
      resources,
      ...pagination.value,
      rejected_resource_uris: rejectedResourceUris.slice(0, MAX_RESOURCES),
    });
  }

  private error(message: string): ErrorInfo {
    return { code: "NOVA-TL002", message, retryable: false };
  }
}

function parseResource(value: unknown): Result<McpResourceAdvertisement> {
  if (!isRecord(value)) return err(invalidResource());
  if (
    typeof value.uri !== "string" ||
    value.uri.length === 0 ||
    value.uri.length > MAX_URI_LENGTH ||
    !isSafeResourceUri(value.uri) ||
    typeof value.name !== "string" ||
    value.name.trim().length === 0 ||
    value.name.length > MAX_NAME_LENGTH
  ) {
    return err(invalidResource());
  }
  if (value.title !== undefined && !isBoundedString(value.title, MAX_NAME_LENGTH)) {
    return err(invalidResource());
  }
  if (
    value.description !== undefined &&
    !isBoundedString(value.description, MAX_DESCRIPTION_LENGTH)
  ) {
    return err(invalidResource());
  }
  if (value.mimeType !== undefined && !isBoundedString(value.mimeType, MAX_MIME_TYPE_LENGTH)) {
    return err(invalidResource());
  }
  if (
    value.size !== undefined &&
    (typeof value.size !== "number" ||
      !Number.isSafeInteger(value.size) ||
      value.size < 0 ||
      value.size > MAX_RESOURCE_SIZE_BYTES)
  ) {
    return err(invalidResource());
  }
  return ok({
    uri: value.uri,
    name: value.name,
    ...(value.title === undefined ? {} : { title: value.title }),
    ...(value.description === undefined ? {} : { description: value.description }),
    ...(value.mimeType === undefined ? {} : { mime_type: value.mimeType }),
    ...(value.size === undefined ? {} : { size_bytes: value.size }),
  });
}

function parsePagination(
  result: Readonly<Record<string, unknown>>,
): Result<Pick<McpResourcesListResult, "next_cursor" | "ttl_ms" | "cache_scope">> {
  if (result.nextCursor !== undefined) {
    if (typeof result.nextCursor !== "string" || result.nextCursor.length > MAX_CURSOR_LENGTH) {
      return err(invalidResource());
    }
  }
  if (result.ttlMs !== undefined) {
    if (
      typeof result.ttlMs !== "number" ||
      !Number.isInteger(result.ttlMs) ||
      result.ttlMs <= 0 ||
      result.ttlMs > MAX_TTL_MS
    ) {
      return err(invalidResource());
    }
  }
  if (
    result.cacheScope !== undefined &&
    result.cacheScope !== "public" &&
    result.cacheScope !== "private"
  ) {
    return err(invalidResource());
  }
  if (result.resultType !== undefined && result.resultType !== "complete") {
    return err(invalidResource());
  }
  return ok({
    ...(result.nextCursor === undefined ? {} : { next_cursor: result.nextCursor }),
    ...(result.ttlMs === undefined ? {} : { ttl_ms: result.ttlMs }),
    ...(result.cacheScope === undefined ? {} : { cache_scope: result.cacheScope }),
  });
}

function isSafeResourceUri(value: string): boolean {
  if (/\s/.test(value)) return false;
  try {
    const url = new URL(value);
    if (!url.protocol || url.username !== "" || url.password !== "") return false;
    if (
      url.protocol === "file:" &&
      /(?:^|\/)\.\.(?:\/|$)/.test(value.slice(value.indexOf(":") + 1))
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function isBoundedString(value: unknown, maxLength: number): value is string {
  return typeof value === "string" && value.length <= maxLength;
}

function rejectedUri(value: unknown): string {
  if (!isRecord(value) || typeof value.uri !== "string" || value.uri.length === 0) {
    return "<unnamed>";
  }
  return value.uri.slice(0, MAX_URI_LENGTH);
}

function invalidResource(): ErrorInfo {
  return {
    code: "NOVA-TL002",
    message: "MCP resource advertisement is malformed.",
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
