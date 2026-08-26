import { err, ok, type ErrorInfo, type Result } from "@nova/shared";

export interface McpResourceTemplateAdvertisement {
  readonly uri_template: string;
  readonly name: string;
  readonly title?: string;
  readonly description?: string;
  readonly mime_type?: string;
}

export interface McpResourcesTemplatesListResult {
  readonly resource_templates: readonly McpResourceTemplateAdvertisement[];
  readonly next_cursor?: string;
  readonly ttl_ms?: number;
  readonly cache_scope?: "public" | "private";
  readonly rejected_template_names: readonly string[];
}

const MAX_TEMPLATES = 128;
const MAX_URI_TEMPLATE_LENGTH = 2_048;
const MAX_NAME_LENGTH = 256;
const MAX_DESCRIPTION_LENGTH = 2_048;
const MAX_MIME_TYPE_LENGTH = 128;
const MAX_CURSOR_LENGTH = 256;
const MAX_TTL_MS = 86_400_000;
const TEMPLATE_VARIABLE =
  /\{[+#./;?&]?[A-Za-z][A-Za-z0-9_.-]*(?:,(?:[A-Za-z][A-Za-z0-9_.-]*))*\*?(?::\d+)?\}/g;

export class McpResourcesTemplatesListResponseValidator {
  public parse(
    response: unknown,
    expectedId: string | number,
  ): Result<McpResourcesTemplatesListResult> {
    if (!isRecord(response) || response.jsonrpc !== "2.0" || response.id !== expectedId) {
      return err(this.error("MCP resources/templates/list response correlation is invalid."));
    }
    if ("error" in response || !isRecord(response.result)) {
      return err(this.error("MCP resources/templates/list response is not a successful result."));
    }
    const rawTemplates = response.result.resourceTemplates;
    if (!Array.isArray(rawTemplates) || rawTemplates.length > MAX_TEMPLATES) {
      return err(
        this.error("MCP resources/templates/list result is missing a bounded template list."),
      );
    }

    const templates: McpResourceTemplateAdvertisement[] = [];
    const rejectedTemplateNames: string[] = [];
    const names = new Set<string>();
    const uriTemplates = new Set<string>();
    for (const rawTemplate of rawTemplates) {
      const parsed = parseTemplate(rawTemplate);
      if (
        !parsed.ok ||
        names.has(parsed.value.name) ||
        uriTemplates.has(parsed.value.uri_template)
      ) {
        rejectedTemplateNames.push(rejectedName(rawTemplate));
        continue;
      }
      names.add(parsed.value.name);
      uriTemplates.add(parsed.value.uri_template);
      templates.push(parsed.value);
    }

    const pagination = parsePagination(response.result);
    if (!pagination.ok) return pagination;
    if (rawTemplates.length > 0 && templates.length === 0) {
      return err(this.error("MCP resources/templates/list contained no valid templates."));
    }
    return ok({
      resource_templates: templates,
      ...pagination.value,
      rejected_template_names: rejectedTemplateNames.slice(0, MAX_TEMPLATES),
    });
  }

  private error(message: string): ErrorInfo {
    return { code: "NOVA-TL002", message, retryable: false };
  }
}

function parseTemplate(value: unknown): Result<McpResourceTemplateAdvertisement> {
  if (!isRecord(value)) return err(invalidTemplate());
  if (
    typeof value.uriTemplate !== "string" ||
    value.uriTemplate.length === 0 ||
    value.uriTemplate.length > MAX_URI_TEMPLATE_LENGTH ||
    !isSafeUriTemplate(value.uriTemplate) ||
    typeof value.name !== "string" ||
    value.name.trim().length === 0 ||
    value.name.length > MAX_NAME_LENGTH
  ) {
    return err(invalidTemplate());
  }
  if (value.title !== undefined && !isBoundedString(value.title, MAX_NAME_LENGTH)) {
    return err(invalidTemplate());
  }
  if (
    value.description !== undefined &&
    !isBoundedString(value.description, MAX_DESCRIPTION_LENGTH)
  ) {
    return err(invalidTemplate());
  }
  if (value.mimeType !== undefined && !isBoundedString(value.mimeType, MAX_MIME_TYPE_LENGTH)) {
    return err(invalidTemplate());
  }
  return ok({
    uri_template: value.uriTemplate,
    name: value.name,
    ...(value.title === undefined ? {} : { title: value.title }),
    ...(value.description === undefined ? {} : { description: value.description }),
    ...(value.mimeType === undefined ? {} : { mime_type: value.mimeType }),
  });
}

function parsePagination(
  result: Readonly<Record<string, unknown>>,
): Result<Pick<McpResourcesTemplatesListResult, "next_cursor" | "ttl_ms" | "cache_scope">> {
  if (result.nextCursor !== undefined) {
    if (typeof result.nextCursor !== "string" || result.nextCursor.length > MAX_CURSOR_LENGTH) {
      return err(invalidTemplate());
    }
  }
  if (result.ttlMs !== undefined) {
    if (
      typeof result.ttlMs !== "number" ||
      !Number.isInteger(result.ttlMs) ||
      result.ttlMs <= 0 ||
      result.ttlMs > MAX_TTL_MS
    ) {
      return err(invalidTemplate());
    }
  }
  if (
    result.cacheScope !== undefined &&
    result.cacheScope !== "public" &&
    result.cacheScope !== "private"
  ) {
    return err(invalidTemplate());
  }
  if (result.resultType !== undefined && result.resultType !== "complete") {
    return err(invalidTemplate());
  }
  return ok({
    ...(result.nextCursor === undefined ? {} : { next_cursor: result.nextCursor }),
    ...(result.ttlMs === undefined ? {} : { ttl_ms: result.ttlMs }),
    ...(result.cacheScope === undefined ? {} : { cache_scope: result.cacheScope }),
  });
}

function isSafeUriTemplate(value: string): boolean {
  if (/\s/.test(value) || /(?:^|\/)\.\.(?:\/|$)/.test(value)) return false;
  if (!/^[A-Za-z][A-Za-z0-9+.-]*:/.test(value)) return false;
  if (!hasValidTemplateExpressions(value)) return false;
  const concreteUri = value.replace(TEMPLATE_VARIABLE, "x");
  try {
    const url = new URL(concreteUri);
    return url.username === "" && url.password === "";
  } catch {
    return false;
  }
}

function hasValidTemplateExpressions(value: string): boolean {
  const withoutTemplates = value.replace(TEMPLATE_VARIABLE, "");
  return !/[{}]/.test(withoutTemplates);
}

function isBoundedString(value: unknown, maxLength: number): value is string {
  return typeof value === "string" && value.length <= maxLength;
}

function rejectedName(value: unknown): string {
  if (!isRecord(value) || typeof value.name !== "string" || value.name.length === 0) {
    return "<unnamed>";
  }
  return value.name.slice(0, MAX_NAME_LENGTH);
}

function invalidTemplate(): ErrorInfo {
  return {
    code: "NOVA-TL002",
    message: "MCP resource-template advertisement is malformed.",
    retryable: false,
  };
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
