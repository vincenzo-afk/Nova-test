import { err, ok, type ErrorInfo, type Result } from "@nova/shared";

export interface McpResourcesTemplatesListRequest {
  readonly jsonrpc: "2.0";
  readonly id: number;
  readonly method: "resources/templates/list";
  readonly params: {
    readonly cursor?: string;
  };
}

const MAX_REQUEST_ID = Number.MAX_SAFE_INTEGER;
const MAX_CURSOR_LENGTH = 256;

export class McpResourcesTemplatesListRequestBuilder {
  private nextRequestId = 1;

  public create(
    options: Readonly<Record<string, unknown>> = {},
  ): Result<McpResourcesTemplatesListRequest> {
    if (!isRecord(options)) {
      return err(this.error("MCP resources/templates/list request is malformed."));
    }
    if (
      options.cursor !== undefined &&
      (typeof options.cursor !== "string" ||
        options.cursor.length === 0 ||
        options.cursor.length > MAX_CURSOR_LENGTH)
    ) {
      return err(this.error("MCP resources/templates/list cursor is invalid or too large."));
    }
    if (this.nextRequestId > MAX_REQUEST_ID) {
      return err(this.error("MCP request identifier space is exhausted."));
    }

    const id = this.nextRequestId;
    this.nextRequestId += 1;
    return ok({
      jsonrpc: "2.0",
      id,
      method: "resources/templates/list",
      params: options.cursor === undefined ? {} : { cursor: options.cursor },
    });
  }

  private error(message: string): ErrorInfo {
    return { code: "NOVA-TL002", message, retryable: false };
  }
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
