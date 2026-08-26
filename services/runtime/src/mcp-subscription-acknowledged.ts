import { err, ok, type ErrorInfo, type Result } from "@nova/shared";

export interface McpSubscriptionAcknowledgedNotifications {
  readonly tools_list_changed?: boolean;
  readonly prompts_list_changed?: boolean;
  readonly resources_list_changed?: boolean;
  readonly resource_subscriptions?: readonly string[];
}

export interface McpSubscriptionAcknowledged {
  readonly method: "notifications/subscriptions/acknowledged";
  readonly subscription_id: string | number;
  readonly notifications: McpSubscriptionAcknowledgedNotifications;
}

const MAX_NOTIFICATION_BYTES = 131_072;
const MAX_SUBSCRIPTION_ID_LENGTH = 256;
const MAX_RESOURCE_SUBSCRIPTIONS = 128;
const MAX_URI_LENGTH = 2_048;

export class McpSubscriptionAcknowledgedValidator {
  public parse(value: unknown): Result<McpSubscriptionAcknowledged> {
    const serialized = safeJson(value);
    if (serialized === undefined || serialized.length > MAX_NOTIFICATION_BYTES) {
      return err(this.error("MCP subscription acknowledgment is invalid or too large."));
    }
    if (!isRecord(value) || value.jsonrpc !== "2.0" || value.id !== undefined) {
      return err(this.error("MCP subscription acknowledgment is not a notification."));
    }
    if (value.method !== "notifications/subscriptions/acknowledged" || !isRecord(value.params)) {
      return err(this.error("MCP subscription acknowledgment is malformed."));
    }
    if (!isRecord(value.params._meta)) {
      return err(this.error("MCP subscription acknowledgment is missing correlation metadata."));
    }
    const subscriptionId = value.params._meta["io.modelcontextprotocol/subscriptionId"];
    if (!isSubscriptionId(subscriptionId)) {
      return err(this.error("MCP subscription acknowledgment correlation is invalid."));
    }
    if (!isRecord(value.params.notifications)) {
      return err(this.error("MCP subscription acknowledgment filter is malformed."));
    }

    const notifications = parseNotifications(value.params.notifications);
    if (!notifications.ok) return notifications;
    return ok({
      method: "notifications/subscriptions/acknowledged",
      subscription_id: subscriptionId,
      notifications: notifications.value,
    });
  }

  private error(message: string): ErrorInfo {
    return { code: "NOVA-TL002", message, retryable: false };
  }
}

function parseNotifications(
  value: Readonly<Record<string, unknown>>,
): Result<McpSubscriptionAcknowledgedNotifications> {
  const normalized: McpSubscriptionAcknowledgedNotifications = {};
  for (const key of ["toolsListChanged", "promptsListChanged", "resourcesListChanged"] as const) {
    if (value[key] !== undefined) {
      if (typeof value[key] !== "boolean") return err(invalidFilter());
      Object.assign(normalized, { [toSnakeCase(key)]: value[key] });
    }
  }
  if (value.resourceSubscriptions !== undefined) {
    if (
      !Array.isArray(value.resourceSubscriptions) ||
      value.resourceSubscriptions.length > MAX_RESOURCE_SUBSCRIPTIONS
    ) {
      return err(invalidFilter());
    }
    const uris: string[] = [];
    const seen = new Set<string>();
    for (const uri of value.resourceSubscriptions) {
      if (!isSafeResourceUri(uri) || seen.has(uri)) return err(invalidFilter());
      seen.add(uri);
      uris.push(uri);
    }
    Object.assign(normalized, { resource_subscriptions: uris });
  }
  return ok(normalized);
}

function toSnakeCase(value: string): string {
  return value.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function isSubscriptionId(value: unknown): value is string | number {
  return (
    (typeof value === "string" && value.length > 0 && value.length <= MAX_SUBSCRIPTION_ID_LENGTH) ||
    (typeof value === "number" && Number.isSafeInteger(value))
  );
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
    message: "MCP subscription acknowledgment filter is malformed or unsafe.",
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
