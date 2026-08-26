import { err, ok, type ErrorInfo, type Result } from "@nova/shared";

export interface McpSubscriptionsListenRequest {
  readonly jsonrpc: "2.0";
  readonly id: number;
  readonly method: "subscriptions/listen";
  readonly params: {
    readonly notifications: {
      readonly toolsListChanged?: boolean;
      readonly promptsListChanged?: boolean;
      readonly resourcesListChanged?: boolean;
      readonly resourceSubscriptions?: readonly string[];
    };
  };
}

export interface McpSubscriptionsListenFilter {
  readonly toolsListChanged?: boolean;
  readonly promptsListChanged?: boolean;
  readonly resourcesListChanged?: boolean;
  readonly resourceSubscriptions?: readonly string[];
}

const MAX_REQUEST_ID = Number.MAX_SAFE_INTEGER;
const MAX_FILTER_KEYS = 4;
const MAX_RESOURCE_SUBSCRIPTIONS = 128;
const MAX_URI_LENGTH = 2_048;
const MAX_REQUEST_BYTES = 131_072;

export class McpSubscriptionsListenRequestBuilder {
  private nextRequestId = 1;

  public create(filter: Readonly<Record<string, unknown>>): Result<McpSubscriptionsListenRequest> {
    if (!isRecord(filter)) return err(this.error("MCP subscriptions/listen filter is malformed."));
    const filterKeys = Object.keys(filter);
    if (filterKeys.length === 0 || filterKeys.length > MAX_FILTER_KEYS) {
      return err(this.error("MCP subscriptions/listen filter must request an event type."));
    }

    const notifications: McpSubscriptionsListenFilter = {};
    for (const key of ["toolsListChanged", "promptsListChanged", "resourcesListChanged"] as const) {
      if (filter[key] !== undefined) {
        if (typeof filter[key] !== "boolean")
          return err(this.error("MCP notification filter flag is invalid."));
        Object.assign(notifications, { [key]: filter[key] });
      }
    }

    if (filter.resourceSubscriptions !== undefined) {
      const resourceSubscriptions = parseResourceSubscriptions(filter.resourceSubscriptions);
      if (!resourceSubscriptions.ok) return resourceSubscriptions;
      Object.assign(notifications, { resourceSubscriptions: resourceSubscriptions.value });
    }

    if (Object.keys(notifications).length === 0) {
      return err(this.error("MCP subscriptions/listen filter contains no supported event type."));
    }
    if (this.nextRequestId > MAX_REQUEST_ID) {
      return err(this.error("MCP request identifier space is exhausted."));
    }

    const params = { notifications };
    const serialized = safeJson(params);
    if (serialized === undefined || serialized.length > MAX_REQUEST_BYTES) {
      return err(this.error("MCP subscriptions/listen request is invalid or too large."));
    }
    const id = this.nextRequestId;
    this.nextRequestId += 1;
    return ok({
      jsonrpc: "2.0",
      id,
      method: "subscriptions/listen",
      params: JSON.parse(serialized) as McpSubscriptionsListenRequest["params"],
    });
  }

  private error(message: string): ErrorInfo {
    return { code: "NOVA-TL002", message, retryable: false };
  }
}

function parseResourceSubscriptions(value: unknown): Result<readonly string[]> {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_RESOURCE_SUBSCRIPTIONS) {
    return err(invalidFilter());
  }
  const normalized: string[] = [];
  const seen = new Set<string>();
  for (const uri of value) {
    if (!isSafeResourceUri(uri) || seen.has(uri)) return err(invalidFilter());
    seen.add(uri);
    normalized.push(uri);
  }
  return ok(normalized);
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

function invalidFilter(): ErrorInfo {
  return {
    code: "NOVA-TL002",
    message: "MCP subscriptions/listen filter is malformed or unsafe.",
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
