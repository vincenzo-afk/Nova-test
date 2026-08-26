import { describe, expect, it } from "vitest";
import { McpSubscriptionCancelNotificationBuilder } from "../src/mcp-subscription-cancel-notification.js";

describe("McpSubscriptionCancelNotificationBuilder", () => {
  it("builds a fixed cancellation notification for a numeric subscription request ID", () => {
    const builder = new McpSubscriptionCancelNotificationBuilder();

    expect(builder.create(7)).toEqual({
      ok: true,
      value: {
        jsonrpc: "2.0",
        method: "notifications/cancelled",
        params: { requestId: 7 },
      },
    });
  });

  it("builds a cloned string request ID and exposes no extra fields", () => {
    const builder = new McpSubscriptionCancelNotificationBuilder();

    expect(builder.create("subscription-request-1")).toEqual({
      ok: true,
      value: {
        jsonrpc: "2.0",
        method: "notifications/cancelled",
        params: { requestId: "subscription-request-1" },
      },
    });
  });

  it("rejects invalid request IDs without creating a transport action", () => {
    const builder = new McpSubscriptionCancelNotificationBuilder();

    expect(builder.create(0.5)).toMatchObject({
      ok: false,
      error: { code: "NOVA-TL002" },
    });
    expect(builder.create("".trim())).toMatchObject({
      ok: false,
      error: { code: "NOVA-TL002" },
    });
    expect(builder.create("x".repeat(257))).toMatchObject({
      ok: false,
      error: { code: "NOVA-TL002" },
    });
    expect(builder.create({ requestId: 7 })).toMatchObject({
      ok: false,
      error: { code: "NOVA-TL002" },
    });
  });
});
