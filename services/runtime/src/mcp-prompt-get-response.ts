import { err, ok, type ErrorInfo, type Result } from "@nova/shared";
import type { McpObservedContent } from "./mcp-tool-call-result.js";

export interface McpPromptObservedMessage {
  readonly role: "user" | "assistant";
  readonly content: McpObservedContent;
}

export interface McpPromptGetResult {
  readonly description?: string;
  readonly messages: readonly McpPromptObservedMessage[];
}

const MAX_RESPONSE_BYTES = 131_072;
const MAX_MESSAGES = 128;
const MAX_DESCRIPTION_LENGTH = 2_048;
const MAX_URI_LENGTH = 2_048;
const MAX_NAME_LENGTH = 512;
const MAX_MIME_TYPE_LENGTH = 128;
const MAX_TEXT_LENGTH = 16_384;
const MAX_MEDIA_DATA_LENGTH = 131_072;
const BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

export class McpPromptGetResponseValidator {
  public parse(response: unknown, expectedId: string | number): Result<McpPromptGetResult> {
    const serialized = safeJson(response);
    if (serialized === undefined || serialized.length > MAX_RESPONSE_BYTES) {
      return err(this.error("MCP prompts/get response is invalid or too large."));
    }
    if (!isRecord(response) || response.jsonrpc !== "2.0" || response.id !== expectedId) {
      return err(this.error("MCP prompts/get response correlation is invalid."));
    }
    if ("error" in response || !isRecord(response.result)) {
      return err(this.error("MCP prompts/get response is not a successful result."));
    }
    if (
      response.result.description !== undefined &&
      !isBoundedString(response.result.description, MAX_DESCRIPTION_LENGTH)
    ) {
      return err(this.error("MCP prompts/get description is malformed or too large."));
    }
    if (response.result.resultType !== undefined && response.result.resultType !== "complete") {
      return err(this.error("MCP prompts/get result type is unsupported."));
    }
    const rawMessages = response.result.messages;
    if (!Array.isArray(rawMessages) || rawMessages.length > MAX_MESSAGES) {
      return err(this.error("MCP prompts/get result is missing a bounded message list."));
    }

    const messages: McpPromptObservedMessage[] = [];
    for (const rawMessage of rawMessages) {
      const normalized = normalizeMessage(rawMessage);
      if (normalized !== undefined) messages.push(normalized);
    }
    if (messages.length === 0) {
      return err(this.error("MCP prompts/get result contains no valid observed messages."));
    }
    return ok({
      ...(response.result.description === undefined
        ? {}
        : { description: response.result.description }),
      messages,
    });
  }

  private error(message: string): ErrorInfo {
    return { code: "NOVA-TL002", message, retryable: false };
  }
}

function normalizeMessage(value: unknown): McpPromptObservedMessage | undefined {
  if (!isRecord(value) || (value.role !== "user" && value.role !== "assistant")) return undefined;
  const content = normalizeContent(value.content);
  return content === undefined ? undefined : { role: value.role, content };
}

function normalizeContent(value: unknown): McpObservedContent | undefined {
  if (!isRecord(value) || typeof value.type !== "string") return undefined;
  if (value.type === "text") {
    if (!isNonEmptyBoundedString(value.text, MAX_TEXT_LENGTH)) return undefined;
    return { kind: "text", observed: true, text: value.text };
  }
  if (value.type === "image" || value.type === "audio") {
    if (!isValidBase64(value.data, MAX_MEDIA_DATA_LENGTH)) return undefined;
    if (!isOptionalBoundedString(value.mimeType, MAX_MIME_TYPE_LENGTH)) return undefined;
    return {
      kind: value.type,
      observed: true,
      data: value.data,
      ...(value.mimeType === undefined ? {} : { mime_type: value.mimeType }),
    };
  }
  if (value.type === "resource_link") {
    if (!isSafeResourceUri(value.uri)) return undefined;
    if (!isOptionalBoundedString(value.name, MAX_NAME_LENGTH)) return undefined;
    if (!isOptionalBoundedString(value.mimeType, MAX_MIME_TYPE_LENGTH)) return undefined;
    return {
      kind: "resource_link",
      observed: true,
      uri: value.uri,
      ...(value.name === undefined ? {} : { name: value.name }),
      ...(value.mimeType === undefined ? {} : { mime_type: value.mimeType }),
    };
  }
  if (value.type === "resource" && isRecord(value.resource)) {
    if (!isSafeResourceUri(value.resource.uri)) return undefined;
    if (!isOptionalBoundedString(value.resource.mimeType, MAX_MIME_TYPE_LENGTH)) return undefined;
    const text = value.resource.text;
    const blob = value.resource.blob;
    const hasText = text !== undefined;
    const hasBlob = blob !== undefined;
    if (hasText === hasBlob) return undefined;
    if (hasText) {
      if (!isNonEmptyBoundedString(text, MAX_TEXT_LENGTH)) return undefined;
      return {
        kind: "resource",
        observed: true,
        uri: value.resource.uri,
        ...(value.resource.mimeType === undefined ? {} : { mime_type: value.resource.mimeType }),
        text,
      };
    }
    if (!isValidBase64(blob, MAX_MEDIA_DATA_LENGTH)) return undefined;
    return {
      kind: "resource",
      observed: true,
      uri: value.resource.uri,
      ...(value.resource.mimeType === undefined ? {} : { mime_type: value.resource.mimeType }),
      data: blob,
    };
  }
  return undefined;
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

function isValidBase64(value: unknown, maxLength: number): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= maxLength &&
    value.length % 4 === 0 &&
    BASE64_PATTERN.test(value)
  );
}

function isNonEmptyBoundedString(value: unknown, maxLength: number): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= maxLength;
}

function isOptionalBoundedString(value: unknown, maxLength: number): value is string | undefined {
  return value === undefined || (typeof value === "string" && value.length <= maxLength);
}

function isBoundedString(value: unknown, maxLength: number): value is string {
  return typeof value === "string" && value.length <= maxLength;
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
