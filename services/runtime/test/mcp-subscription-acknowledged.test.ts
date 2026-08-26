import { describe, expect, it } from "vitest";
import { McpSubscriptionAcknowledgedValidator } from "../src/mcp-subscription-acknowledged.js";

describe("McpSubscriptionAcknowledgedValidator", () => {
  it("normalizes a correlated subscription acknowledgment and agreed filters", () => {
    const validator = new McpSubscriptionAcknowledgedValidator();

    expect(
      validator.parse({
        jsonrpc: "2.0",
        method: "notifications/subscriptions/acknowledged",
        params: {
          _meta: { "io.modelcontextprotocol/subscriptionId": 7 },
          notifications: {
            toolsListChanged: true,
            resourcesListChanged: false,
            resourceSubscriptions: ["file:///project/config.json"],
          },
        },
      }),
    ).toEqual({
      ok: true,
      value: {
        method: "notifications/subscriptions/acknowledged",
        subscription_id: 7,
        notifications: {
          tools_list_changed: true,
          resources_list_changed: false,
          resource_subscriptions: ["file:///project/config.json"],
        },
      },
    });
  });

  it("retains only supported agreed filters and hides metadata", () => {
    const validator = new McpSubscriptionAcknowledgedValidator();
    const result = validator.parse({
      jsonrpc: "2.0",
      method: "notifications/subscriptions/acknowledged",
      params: {
        _meta: {
          "io.modelcontextprotocol/subscriptionId": "sub-1",
          secret: "not forwarded",
        },
        notifications: {
          promptsListChanged: true,
          ignored: "not forwarded",
        },
      },
    });

    expect(result).toEqual({
      ok: true,
      value: {
        method: "notifications/subscriptions/acknowledged",
        subscription_id: "sub-1",
        notifications: { prompts_list_changed: true },
      },
    });
    expect(JSON.stringify(result)).not.toContain("secret");
    expect(JSON.stringify(result)).not.toContain("ignored");
  });

  it("rejects malformed notifications, missing correlation, unsafe URIs, and invalid filter values", () => {
    const validator = new McpSubscriptionAcknowledgedValidator();

    expect(
      validator.parse({ jsonrpc: "2.0", method: "notifications/subscriptions/acknowledged" }),
    ).toMatchObject({
      ok: false,
      error: { code: "NOVA-TL002" },
    });
    expect(
      validator.parse({
        jsonrpc: "2.0",
        method: "notifications/subscriptions/acknowledged",
        params: {
          notifications: { toolsListChanged: true },
        },
      }),
    ).toMatchObject({ ok: false, error: { code: "NOVA-TL002" } });
    expect(
      validator.parse({
        jsonrpc: "2.0",
        method: "notifications/subscriptions/acknowledged",
        params: {
          _meta: { "io.modelcontextprotocol/subscriptionId": 1 },
          notifications: { resourceSubscriptions: ["file:///project/../secret"] },
        },
      }),
    ).toMatchObject({ ok: false, error: { code: "NOVA-TL002" } });
    expect(
      validator.parse({
        jsonrpc: "2.0",
        method: "notifications/subscriptions/acknowledged",
        params: {
          _meta: { "io.modelcontextprotocol/subscriptionId": 1 },
          notifications: { toolsListChanged: "yes" },
        },
      }),
    ).toMatchObject({ ok: false, error: { code: "NOVA-TL002" } });
  });
});
