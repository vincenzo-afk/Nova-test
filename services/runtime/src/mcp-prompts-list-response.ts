import { err, ok, type ErrorInfo, type Result } from "@nova/shared";

export interface McpPromptArgument {
  readonly name: string;
  readonly title?: string;
  readonly description?: string;
  readonly required?: boolean;
}

export interface McpPromptAdvertisement {
  readonly name: string;
  readonly title?: string;
  readonly description?: string;
  readonly arguments?: readonly McpPromptArgument[];
}

export interface McpPromptsListResult {
  readonly prompts: readonly McpPromptAdvertisement[];
  readonly next_cursor?: string;
  readonly ttl_ms?: number;
  readonly cache_scope?: "public" | "private";
  readonly rejected_prompt_names: readonly string[];
}

const MAX_RESPONSE_BYTES = 1_048_576;
const MAX_PROMPTS = 128;
const MAX_ARGUMENTS = 32;
const MAX_NAME_LENGTH = 128;
const MAX_DESCRIPTION_LENGTH = 2_048;
const MAX_CURSOR_LENGTH = 256;
const MAX_TTL_MS = 86_400_000;
const IDENTIFIER_PATTERN = /^[A-Za-z0-9_.-]+$/;

export class McpPromptsListResponseValidator {
  public parse(response: unknown, expectedId: string | number): Result<McpPromptsListResult> {
    const serialized = safeJson(response);
    if (serialized === undefined || serialized.length > MAX_RESPONSE_BYTES) {
      return err(this.error("MCP prompts/list response is invalid or too large."));
    }
    if (!isRecord(response) || response.jsonrpc !== "2.0" || response.id !== expectedId) {
      return err(this.error("MCP prompts/list response correlation is invalid."));
    }
    if ("error" in response || !isRecord(response.result)) {
      return err(this.error("MCP prompts/list response is not a successful result."));
    }
    const rawPrompts = response.result.prompts;
    if (!Array.isArray(rawPrompts) || rawPrompts.length > MAX_PROMPTS) {
      return err(this.error("MCP prompts/list result is missing a bounded prompt list."));
    }

    const prompts: McpPromptAdvertisement[] = [];
    const rejectedPromptNames: string[] = [];
    const names = new Set<string>();
    for (const rawPrompt of rawPrompts) {
      const parsed = parsePrompt(rawPrompt);
      if (!parsed.ok || names.has(parsed.value.name)) {
        rejectedPromptNames.push(rejectedName(rawPrompt));
        continue;
      }
      names.add(parsed.value.name);
      prompts.push(parsed.value);
    }

    const pagination = parsePagination(response.result);
    if (!pagination.ok) return pagination;
    return ok({
      prompts,
      ...pagination.value,
      rejected_prompt_names: rejectedPromptNames.slice(0, MAX_PROMPTS),
    });
  }

  private error(message: string): ErrorInfo {
    return { code: "NOVA-TL002", message, retryable: false };
  }
}

function parsePrompt(value: unknown): Result<McpPromptAdvertisement> {
  if (
    !isRecord(value) ||
    !isIdentifier(value.name) ||
    (value.title !== undefined && !isBoundedString(value.title, MAX_NAME_LENGTH)) ||
    (value.description !== undefined && !isBoundedString(value.description, MAX_DESCRIPTION_LENGTH))
  ) {
    return err(invalidPrompt());
  }
  if (value.arguments !== undefined) {
    if (!Array.isArray(value.arguments) || value.arguments.length > MAX_ARGUMENTS) {
      return err(invalidPrompt());
    }
    const args: McpPromptArgument[] = [];
    const names = new Set<string>();
    for (const rawArgument of value.arguments) {
      const parsed = parseArgument(rawArgument);
      if (!parsed.ok || names.has(parsed.value.name)) return err(invalidPrompt());
      names.add(parsed.value.name);
      args.push(parsed.value);
    }
    return ok({
      name: value.name,
      ...(value.title === undefined ? {} : { title: value.title }),
      ...(value.description === undefined ? {} : { description: value.description }),
      arguments: args,
    });
  }
  return ok({
    name: value.name,
    ...(value.title === undefined ? {} : { title: value.title }),
    ...(value.description === undefined ? {} : { description: value.description }),
  });
}

function parseArgument(value: unknown): Result<McpPromptArgument> {
  if (
    !isRecord(value) ||
    !isIdentifier(value.name) ||
    (value.title !== undefined && !isBoundedString(value.title, MAX_NAME_LENGTH)) ||
    (value.description !== undefined &&
      !isBoundedString(value.description, MAX_DESCRIPTION_LENGTH)) ||
    (value.required !== undefined && typeof value.required !== "boolean")
  ) {
    return err(invalidPrompt());
  }
  return ok({
    name: value.name,
    ...(value.title === undefined ? {} : { title: value.title }),
    ...(value.description === undefined ? {} : { description: value.description }),
    ...(value.required === undefined ? {} : { required: value.required }),
  });
}

function parsePagination(
  result: Readonly<Record<string, unknown>>,
): Result<Pick<McpPromptsListResult, "next_cursor" | "ttl_ms" | "cache_scope">> {
  if (result.nextCursor !== undefined) {
    if (typeof result.nextCursor !== "string" || result.nextCursor.length > MAX_CURSOR_LENGTH) {
      return err(invalidPrompt());
    }
  }
  if (result.ttlMs !== undefined) {
    if (
      typeof result.ttlMs !== "number" ||
      !Number.isInteger(result.ttlMs) ||
      result.ttlMs <= 0 ||
      result.ttlMs > MAX_TTL_MS
    ) {
      return err(invalidPrompt());
    }
  }
  if (
    result.cacheScope !== undefined &&
    result.cacheScope !== "public" &&
    result.cacheScope !== "private"
  ) {
    return err(invalidPrompt());
  }
  if (result.resultType !== undefined && result.resultType !== "complete") {
    return err(invalidPrompt());
  }
  return ok({
    ...(result.nextCursor === undefined ? {} : { next_cursor: result.nextCursor }),
    ...(result.ttlMs === undefined ? {} : { ttl_ms: result.ttlMs }),
    ...(result.cacheScope === undefined ? {} : { cache_scope: result.cacheScope }),
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

function rejectedName(value: unknown): string {
  if (!isRecord(value) || typeof value.name !== "string" || value.name.length === 0) {
    return "<unnamed>";
  }
  return value.name.slice(0, MAX_NAME_LENGTH);
}

function invalidPrompt(): ErrorInfo {
  return {
    code: "NOVA-TL002",
    message: "MCP prompt advertisement is malformed.",
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
