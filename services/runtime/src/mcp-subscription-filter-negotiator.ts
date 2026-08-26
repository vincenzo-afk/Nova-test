import { err, ok, type ErrorInfo, type Result } from "@nova/shared";
import type {
  McpSubscriptionAcknowledged,
  McpSubscriptionAcknowledgedNotifications,
} from "./mcp-subscription-acknowledged.js";
import type { McpSubscriptionsListenFilter } from "./mcp-subscriptions-listen-request.js";

export interface McpNegotiatedSubscription {
  readonly subscription_id: string | number;
  readonly notifications: McpSubscriptionAcknowledgedNotifications;
}

const MAX_SUBSCRIPTION_ID_LENGTH = 256;
const MAX_RESOURCE_SUBSCRIPTIONS = 128;
const MAX_URI_LENGTH = 2_048;
const MAX_FILTER_KEYS = 4;

export class McpSubscriptionFilterNegotiator {
  public negotiate(requested: unknown, acknowledged: unknown): Result<McpNegotiatedSubscription> {
    const requestedFilter = parseRequestedFilter(requested);
    if (!requestedFilter.ok) return requestedFilter;
    const acknowledgedNotification = parseAcknowledged(acknowledged);
    if (!acknowledgedNotification.ok) return acknowledgedNotification;

    const notifications = acknowledgedNotification.value.notifications;
    const negotiated: McpSubscriptionAcknowledgedNotifications = {};
    for (const [requestedKey, acknowledgedKey] of [
      ["toolsListChanged", "tools_list_changed"],
      ["promptsListChanged", "prompts_list_changed"],
      ["resourcesListChanged", "resources_list_changed"],
    ] as const) {
      const value = notifications[acknowledgedKey];
      if (value !== undefined) {
        if (requestedFilter.value[requestedKey] !== true) {
          return err(this.error("MCP server acknowledged an unrequested notification filter."));
        }
        Object.assign(negotiated, { [acknowledgedKey]: value });
      }
    }

    if (notifications.resource_subscriptions !== undefined) {
      const requestedUris = requestedFilter.value.resourceSubscriptions;
      if (requestedUris === undefined) {
        return err(this.error("MCP server acknowledged unrequested resource subscriptions."));
      }
      const requestedSet = new Set(requestedUris);
      if (notifications.resource_subscriptions.some((uri) => !requestedSet.has(uri))) {
        return err(this.error("MCP server acknowledged an unrequested resource URI."));
      }
      Object.assign(negotiated, {
        resource_subscriptions: [...notifications.resource_subscriptions],
      });
    }

    return ok({
      subscription_id: acknowledgedNotification.value.subscription_id,
      notifications: negotiated,
    });
  }

  private error(message: string): ErrorInfo {
    return { code: "NOVA-TL002", message, retryable: false };
  }
}

function parseRequestedFilter(value: unknown): Result<McpSubscriptionsListenFilter> {
  if (!isRecord(value)) return err(invalidFilter());
  const keys = Object.keys(value);
  if (keys.length === 0 || keys.length > MAX_FILTER_KEYS) return err(invalidFilter());
  const normalized: McpSubscriptionsListenFilter = {};
  for (const key of keys) {
    if (
      key !== "toolsListChanged" &&
      key !== "promptsListChanged" &&
      key !== "resourcesListChanged" &&
      key !== "resourceSubscriptions"
    ) {
      return err(invalidFilter());
    }
    if (key === "resourceSubscriptions") {
      const uris = parseResourceSubscriptions(value[key]);
      if (!uris.ok) return uris;
      Object.assign(normalized, { resourceSubscriptions: uris.value });
      continue;
    }
    if (typeof value[key] !== "boolean") return err(invalidFilter());
    Object.assign(normalized, { [key]: value[key] });
  }
  return ok(normalized);
}

function parseAcknowledged(value: unknown): Result<McpSubscriptionAcknowledged> {
  if (!isRecord(value) || value.method !== "notifications/subscriptions/acknowledged") {
    return err(invalidAcknowledgment());
  }
  if (!isSubscriptionId(value.subscription_id) || !isRecord(value.notifications)) {
    return err(invalidAcknowledgment());
  }
  const notifications: McpSubscriptionAcknowledgedNotifications = {};
  for (const key of [
    "tools_list_changed",
    "prompts_list_changed",
    "resources_list_changed",
  ] as const) {
    if (value.notifications[key] !== undefined) {
      if (typeof value.notifications[key] !== "boolean") return err(invalidAcknowledgment());
      Object.assign(notifications, { [key]: value.notifications[key] });
    }
  }
  if (value.notifications.resource_subscriptions !== undefined) {
    const uris = parseResourceSubscriptions(value.notifications.resource_subscriptions);
    if (!uris.ok) return uris;
    Object.assign(notifications, { resource_subscriptions: uris.value });
  }
  return ok({
    method: "notifications/subscriptions/acknowledged",
    subscription_id: value.subscription_id,
    notifications,
  });
}

function parseResourceSubscriptions(value: unknown): Result<readonly string[]> {
  if (!Array.isArray(value) || value.length > MAX_RESOURCE_SUBSCRIPTIONS) {
    return err(invalidFilter());
  }
  const seen = new Set<string>();
  const uris: string[] = [];
  for (const uri of value) {
    if (!isSafeResourceUri(uri) || seen.has(uri)) return err(invalidFilter());
    seen.add(uri);
    uris.push(uri);
  }
  return ok(uris);
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

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function invalidFilter(): ErrorInfo {
  return {
    code: "NOVA-TL002",
    message: "MCP subscription filter is malformed or unsafe.",
    retryable: false,
  };
}

function invalidAcknowledgment(): ErrorInfo {
  return {
    code: "NOVA-TL002",
    message: "MCP subscription acknowledgment is malformed.",
    retryable: false,
  };
}
