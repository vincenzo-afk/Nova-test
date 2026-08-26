import { err, ok, type ErrorInfo, type Result } from "@nova/shared";
import type { ExecutionResult } from "./orchestration.js";

export interface McpObservedContent {
  readonly kind: "text" | "image" | "audio" | "resource_link" | "resource";
  readonly observed: true;
  readonly text?: string;
  readonly mime_type?: string;
  readonly uri?: string;
  readonly name?: string;
  readonly data?: string;
}

export interface McpToolEvidenceValue {
  readonly observed_content: readonly McpObservedContent[];
  readonly structured_content?: unknown;
  readonly is_error?: boolean;
}

export type McpToolExecutionResult = Omit<ExecutionResult, "step_id"> & {
  readonly tool_id: string;
  readonly action_id: string;
};

const MAX_CONTENT_BLOCKS = 128;
const MAX_TEXT_LENGTH = 16_384;
const MAX_STRING_LENGTH = 512;
const MAX_MEDIA_DATA_LENGTH = 131_072;
const MAX_STRUCTURED_CONTENT_BYTES = 131_072;

export class McpToolCallResultValidator {
  public parse(
    response: unknown,
    expectedId: string | number,
    toolId: string,
    actionId: string,
  ): Result<McpToolExecutionResult> {
    if (
      toolId.trim() === "" ||
      actionId.trim() === "" ||
      !isRecord(response) ||
      response.jsonrpc !== "2.0" ||
      response.id !== expectedId
    ) {
      return err(this.error("MCP tools/call response correlation is invalid."));
    }
    if ("error" in response || !isRecord(response.result)) {
      return err(this.error("MCP tools/call response is not a successful result."));
    }

    const normalized = normalizeResult(response.result);
    if (!normalized.ok) return normalized;
    const value: McpToolEvidenceValue = {
      observed_content: normalized.value.observed_content,
      ...(normalized.value.structured_content === undefined
        ? {}
        : { structured_content: normalized.value.structured_content }),
      ...(normalized.value.is_error === undefined ? {} : { is_error: normalized.value.is_error }),
    };
    const isError = normalized.value.is_error === true;
    return ok({
      tool_id: toolId,
      action_id: actionId,
      status: isError ? "failure" : "success",
      evidence: { type: "api_response", value },
      affected_resources: [],
      ...(isError
        ? {
            error: {
              category: "external" as const,
              message: "MCP tool execution reported an error.",
            },
          }
        : {}),
    });
  }

  private error(message: string): ErrorInfo {
    return { code: "NOVA-TL002", message, retryable: false };
  }
}

function normalizeResult(result: Readonly<Record<string, unknown>>): Result<{
  readonly observed_content: readonly McpObservedContent[];
  readonly structured_content?: unknown;
  readonly is_error?: boolean;
}> {
  if (result.content !== undefined && !Array.isArray(result.content)) {
    return err(invalidResult());
  }
  if (Array.isArray(result.content) && result.content.length > MAX_CONTENT_BLOCKS) {
    return err(invalidResult());
  }
  if (result.isError !== undefined && typeof result.isError !== "boolean") {
    return err(invalidResult());
  }
  const observedContent: McpObservedContent[] = [];
  for (const block of (result.content ?? []) as readonly unknown[]) {
    const normalized = normalizeContentBlock(block);
    if (normalized !== undefined) observedContent.push(normalized);
  }

  let structuredContent: unknown;
  if (result.structuredContent !== undefined) {
    const serialized = safeJson(result.structuredContent);
    if (serialized === undefined || serialized.length > MAX_STRUCTURED_CONTENT_BYTES) {
      return err(invalidResult());
    }
    structuredContent = JSON.parse(serialized) as unknown;
  }
  return ok({
    observed_content: observedContent,
    ...(structuredContent === undefined ? {} : { structured_content: structuredContent }),
    ...(result.isError === undefined ? {} : { is_error: result.isError }),
  });
}

function normalizeContentBlock(value: unknown): McpObservedContent | undefined {
  if (!isRecord(value) || typeof value.type !== "string") return undefined;
  if (value.type === "text") {
    if (typeof value.text !== "string" || value.text.length === 0) return undefined;
    return { kind: "text", text: value.text.slice(0, MAX_TEXT_LENGTH), observed: true };
  }
  if (value.type === "image" || value.type === "audio") {
    if (typeof value.data !== "string" || value.data.length === 0) return undefined;
    return {
      kind: value.type,
      data: value.data.slice(0, MAX_MEDIA_DATA_LENGTH),
      ...(typeof value.mimeType === "string"
        ? { mime_type: value.mimeType.slice(0, MAX_STRING_LENGTH) }
        : {}),
      observed: true,
    };
  }
  if (value.type === "resource_link") {
    if (typeof value.uri !== "string" || value.uri.length === 0) return undefined;
    return {
      kind: "resource_link",
      uri: value.uri.slice(0, MAX_STRING_LENGTH),
      ...(typeof value.name === "string" ? { name: value.name.slice(0, MAX_STRING_LENGTH) } : {}),
      ...(typeof value.mimeType === "string"
        ? { mime_type: value.mimeType.slice(0, MAX_STRING_LENGTH) }
        : {}),
      observed: true,
    };
  }
  if (value.type === "resource" && isRecord(value.resource)) {
    const uri = typeof value.resource.uri === "string" ? value.resource.uri : undefined;
    if (uri === undefined) return undefined;
    return { kind: "resource", uri: uri.slice(0, MAX_STRING_LENGTH), observed: true };
  }
  return undefined;
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

function invalidResult(): ErrorInfo {
  return {
    code: "NOVA-TL002",
    message: "MCP tool result is malformed.",
    retryable: false,
  };
}
