import { describe, expect, it } from "vitest";
import type { McpSubscriptionAcknowledged } from "../src/mcp-subscription-acknowledged.js";
import type { McpSubscriptionsListenFilter } from "../src/mcp-subscriptions-listen-request.js";
import { McpSubscriptionFilterNegotiator } from "../src/mcp-subscription-filter-negotiator.js";

describe("McpSubscriptionFilterNegotiator", () => {
  it("returns only the requested subset acknowledged by the server", () => {
    const negotiator = new McpSubscriptionFilterNegotiator();
    const requested: McpSubscriptionsListenFilter = {
      toolsListChanged: true,
      resourcesListChanged: true,
      resourceSubscriptions: ["https://example.test/docs/readme"],
    };
    const acknowledged: McpSubscriptionAcknowledged = {
      method: "notifications/subscriptions/acknowledged",
      subscription_id: "sub-1",
      notifications: {
        tools_list_changed: true,
        resources_list_changed: false,
        resource_subscriptions: ["https://example.test/docs/readme"],
      },
    };

    const result = negotiator.negotiate(requested, acknowledged);
    expect(result).toEqual({
      ok: true,
      value: {
        subscription_id: "sub-1",
        notifications: {
          tools_list_changed: true,
          resources_list_changed: false,
          resource_subscriptions: ["https://example.test/docs/readme"],
        },
      },
    });
    if (result.ok) {
      result.value.notifications.resource_subscriptions?.push("https://example.test/other");
    }
    expect(negotiator.negotiate(requested, acknowledged)).toEqual({
      ok: true,
      value: {
        subscription_id: "sub-1",
        notifications: {
          tools_list_changed: true,
          resources_list_changed: false,
          resource_subscriptions: ["https://example.test/docs/readme"],
        },
      },
    });
  });

  it("rejects acknowledged events that were not requested", () => {
    const negotiator = new McpSubscriptionFilterNegotiator();
    const acknowledged: McpSubscriptionAcknowledged = {
      method: "notifications/subscriptions/acknowledged",
      subscription_id: 4,
      notifications: {
        prompts_list_changed: true,
        resource_subscriptions: ["https://example.test/docs/other"],
      },
    };

    expect(
      negotiator.negotiate(
        { toolsListChanged: true, resourceSubscriptions: ["https://example.test/docs/readme"] },
        acknowledged,
      ),
    ).toMatchObject({ ok: false, error: { code: "NOVA-TL002" } });
  });

  it("fails closed on malformed requested filters and acknowledgments", () => {
    const negotiator = new McpSubscriptionFilterNegotiator();
    const validAcknowledged: McpSubscriptionAcknowledged = {
      method: "notifications/subscriptions/acknowledged",
      subscription_id: 4,
      notifications: {},
    };

    expect(negotiator.negotiate({}, validAcknowledged)).toMatchObject({
      ok: false,
      error: { code: "NOVA-TL002" },
    });
    expect(
      negotiator.negotiate({ toolsListChanged: true }, {
        ...validAcknowledged,
        method: "wrong",
      } as McpSubscriptionAcknowledged),
    ).toMatchObject({ ok: false, error: { code: "NOVA-TL002" } });
  });
});
