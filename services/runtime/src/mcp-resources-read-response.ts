import { err, ok, type ErrorInfo, type Result } from "@nova/shared";

export interface McpResourceContent {
  readonly uri: string;
  readonly mime_type?: string;
  readonly text?: string;
  readonly blob_base64?: string;
}

export interface McpResourcesReadResult {
  readonly contents: readonly McpResourceContent[];
  readonly ttl_ms?: number;
  readonly cache_scope?: "public" | "private";
  readonly rejected_content_uris: readonly string[];
}

const MAX_CONTENTS = 128;
const MAX_URI_LENGTH = 2_048;
const MAX_MIME_TYPE_LENGTH = 128;
const MAX_TEXT_LENGTH = 1_048_576;
const MAX_BLOB_LENGTH = 4_194_304;
const MAX_TTL_MS = 86_400_000;

export class McpResourcesReadResponseValidator {
  public parse(response: unknown, expectedId: string | number): Result<McpResourcesReadResult> {
    if (!isRecord(response) || response.jsonrpc !== "2.0" || response.id !== expectedId) {
      return err(this.error("MCP resources/read response correlation is invalid."));
    }
    if ("error" in response || !isRecord(response.result)) {
      return err(this.error("MCP resources/read response is not a successful result."));
    }
    const rawContents = response.result.contents;
    if (
      !Array.isArray(rawContents) ||
      rawContents.length === 0 ||
      rawContents.length > MAX_CONTENTS
    ) {
      return err(
        this.error("MCP resources/read result must contain a bounded non-empty content list."),
      );
    }

    const contents: McpResourceContent[] = [];
    const rejectedContentUris: string[] = [];
    const uris = new Set<string>();
    for (const rawContent of rawContents) {
      const parsed = parseContent(rawContent);
      if (!parsed.ok || uris.has(parsed.value.uri)) {
        rejectedContentUris.push(rejectedUri(rawContent));
        continue;
      }
      uris.add(parsed.value.uri);
      contents.push(parsed.value);
    }
    if (contents.length === 0) {
      return err(this.error("MCP resources/read result contains no valid content."));
    }

    const pagination = parsePagination(response.result);
    if (!pagination.ok) return pagination;
    return ok({
      contents,
      ...pagination.value,
      rejected_content_uris: rejectedContentUris.slice(0, MAX_CONTENTS),
    });
  }

  private error(message: string): ErrorInfo {
    return { code: "NOVA-TL002", message, retryable: false };
  }
}

function parseContent(value: unknown): Result<McpResourceContent> {
  if (!isRecord(value) || typeof value.uri !== "string" || !isSafeResourceUri(value.uri)) {
    return err(invalidContent());
  }
  if (value.mimeType !== undefined && !isBoundedString(value.mimeType, MAX_MIME_TYPE_LENGTH)) {
    return err(invalidContent());
  }
  const text = typeof value.text === "string" ? value.text : undefined;
  const blob = typeof value.blob === "string" ? value.blob : undefined;
  if ((text === undefined) === (blob === undefined)) return err(invalidContent());
  if (text !== undefined && text.length > MAX_TEXT_LENGTH) return err(invalidContent());
  if (blob !== undefined && (blob.length > MAX_BLOB_LENGTH || !isBase64(blob))) {
    return err(invalidContent());
  }
  return ok({
    uri: value.uri.slice(0, MAX_URI_LENGTH),
    ...(value.mimeType === undefined ? {} : { mime_type: value.mimeType }),
    ...(text === undefined ? { blob_base64: blob as string } : { text }),
  });
}

function parsePagination(
  result: Readonly<Record<string, unknown>>,
): Result<Pick<McpResourcesReadResult, "ttl_ms" | "cache_scope">> {
  if (result.ttlMs !== undefined) {
    if (
      typeof result.ttlMs !== "number" ||
      !Number.isInteger(result.ttlMs) ||
      result.ttlMs <= 0 ||
      result.ttlMs > MAX_TTL_MS
    ) {
      return err(invalidContent());
    }
  }
  if (
    result.cacheScope !== undefined &&
    result.cacheScope !== "public" &&
    result.cacheScope !== "private"
  ) {
    return err(invalidContent());
  }
  if (result.resultType !== undefined && result.resultType !== "complete") {
    return err(invalidContent());
  }
  return ok({
    ...(result.ttlMs === undefined ? {} : { ttl_ms: result.ttlMs }),
    ...(result.cacheScope === undefined ? {} : { cache_scope: result.cacheScope }),
  });
}

function isSafeResourceUri(value: string): boolean {
  if (value.length === 0 || value.length > MAX_URI_LENGTH || /\s/.test(value)) return false;
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

function isBase64(value: string): boolean {
  return (
    value.length % 4 === 0 &&
    /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)
  );
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

function invalidContent(): ErrorInfo {
  return {
    code: "NOVA-TL002",
    message: "MCP resource content is malformed.",
    retryable: false,
  };
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
