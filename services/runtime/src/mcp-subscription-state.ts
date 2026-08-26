import { err, ok, type ErrorInfo, type Result } from "@nova/shared";
import type { McpSubscriptionAcknowledgedNotifications } from "./mcp-subscription-acknowledged.js";
import type { McpNegotiatedSubscription } from "./mcp-subscription-filter-negotiator.js";
import { McpSubscriptionsListenCompleteResponseValidator } from "./mcp-subscriptions-listen-complete-response.js";

export interface McpSubscriptionRecord {
  readonly server_id: string;
  readonly subscription_id: string | number;
  readonly notifications: McpSubscriptionAcknowledgedNotifications;
}

export interface McpSubscriptionStateMiss {
  readonly server_id: string;
  readonly status: "miss";
}

export interface McpSubscriptionCompleted {
  readonly server_id: string;
  readonly subscription_id: string | number;
  readonly status: "completed";
}

type SubscriptionLookup = McpSubscriptionRecord | McpSubscriptionStateMiss;

const MAX_ENTRIES = 128;
const MAX_SUBSCRIPTION_ID_LENGTH = 256;
const MAX_RESOURCE_SUBSCRIPTIONS = 128;
const MAX_URI_LENGTH = 2_048;
const SERVER_ID_PATTERN = /^[A-Za-z0-9_.-]{1,128}$/;

export class McpSubscriptionState {
  private readonly entries = new Map<string, McpSubscriptionRecord>();
  private readonly completionValidator = new McpSubscriptionsListenCompleteResponseValidator();

  public register(serverId: string, subscription: McpNegotiatedSubscription): Result<void> {
    if (!isServerId(serverId) || !isSubscription(subscription)) {
      return err(this.error("MCP subscription state registration is invalid."));
    }
    const record: McpSubscriptionRecord = {
      server_id: serverId,
      subscription_id: subscription.subscription_id,
      notifications: clone(subscription.notifications),
    };
    this.entries.set(key(serverId, subscription.subscription_id), record);
    while (this.entries.size > MAX_ENTRIES) {
      const oldest = this.entries.keys().next().value as string | undefined;
      if (oldest === undefined) break;
      this.entries.delete(oldest);
    }
    return ok(undefined);
  }

  public get(serverId: string, subscriptionId: unknown): Result<SubscriptionLookup> {
    if (!isServerId(serverId) || !isSubscriptionId(subscriptionId)) {
      return err(this.error("MCP subscription state lookup is invalid."));
    }
    const record = this.entries.get(key(serverId, subscriptionId));
    return record === undefined ? ok({ server_id: serverId, status: "miss" }) : ok(clone(record));
  }

  public complete(serverId: string, value: unknown): Result<McpSubscriptionCompleted> {
    if (!isServerId(serverId)) {
      return err(this.error("MCP subscription completion server id is invalid."));
    }
    const completion = this.completionValidator.parse(value);
    if (!completion.ok) return completion;
    const subscriptionKey = key(serverId, completion.value.subscription_id);
    if (!this.entries.has(subscriptionKey)) {
      return err(
        this.error("MCP subscription completion is not associated with an active subscription."),
      );
    }
    this.entries.delete(subscriptionKey);
    return ok({
      server_id: serverId,
      subscription_id: completion.value.subscription_id,
      status: "completed",
    });
  }

  private error(message: string): ErrorInfo {
    return { code: "NOVA-CFG001", message, retryable: false };
  }
}

function isSubscription(value: unknown): value is McpNegotiatedSubscription {
  if (
    !isRecord(value) ||
    !isSubscriptionId(value.subscription_id) ||
    !isRecord(value.notifications)
  ) {
    return false;
  }
  const keys = Object.keys(value.notifications);
  if (keys.length > 4) return false;
  for (const key of [
    "tools_list_changed",
    "prompts_list_changed",
    "resources_list_changed",
  ] as const) {
    if (value.notifications[key] !== undefined && typeof value.notifications[key] !== "boolean") {
      return false;
    }
  }
  if (value.notifications.resource_subscriptions === undefined) return true;
  return isResourceSubscriptions(value.notifications.resource_subscriptions);
}

function isResourceSubscriptions(value: unknown): value is readonly string[] {
  if (!Array.isArray(value) || value.length > MAX_RESOURCE_SUBSCRIPTIONS) return false;
  const seen = new Set<string>();
  for (const uri of value) {
    if (!isSafeResourceUri(uri) || seen.has(uri)) return false;
    seen.add(uri);
  }
  return true;
}

function isSubscriptionId(value: unknown): value is string | number {
  return (
    (typeof value === "string" && value.length > 0 && value.length <= MAX_SUBSCRIPTION_ID_LENGTH) ||
    (typeof value === "number" && Number.isSafeInteger(value))
  );
}

function isServerId(value: string): boolean {
  return SERVER_ID_PATTERN.test(value);
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

function key(serverId: string, subscriptionId: string | number): string {
  return `${serverId}\u0000${typeof subscriptionId}:${String(subscriptionId)}`;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
