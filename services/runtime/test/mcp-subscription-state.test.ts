import { describe, expect, it } from "vitest";
import type { McpNegotiatedSubscription } from "../src/mcp-subscription-filter-negotiator.js";
import { McpSubscriptionState } from "../src/mcp-subscription-state.js";

const negotiated: McpNegotiatedSubscription = {
  subscription_id: "sub-1",
  notifications: {
    tools_list_changed: true,
    resource_subscriptions: ["https://example.test/docs/readme"],
  },
};

describe("McpSubscriptionState", () => {
  it("registers a negotiated subscription and returns a cloned server-scoped record", () => {
    const state = new McpSubscriptionState();
    expect(state.register("server-1", negotiated)).toEqual({ ok: true, value: undefined });

    const record = state.get("server-1", "sub-1");
    expect(record).toEqual({
      ok: true,
      value: {
        server_id: "server-1",
        subscription_id: "sub-1",
        notifications: negotiated.notifications,
      },
    });
    if (record.ok)
      record.value.notifications.resource_subscriptions?.push("https://example.test/other");
    expect(state.get("server-1", "sub-1")).toEqual({
      ok: true,
      value: {
        server_id: "server-1",
        subscription_id: "sub-1",
        notifications: negotiated.notifications,
      },
    });
    expect(state.get("server-2", "sub-1")).toEqual({
      ok: true,
      value: { server_id: "server-2", status: "miss" },
    });
  });

  it("fails closed on a non-serializable notification filter without mutating active state", () => {
    const state = new McpSubscriptionState();
    state.register("server-1", negotiated);
    const circularNotifications: Record<string, unknown> = {};
    circularNotifications.self = circularNotifications;
    const nonSerializable = {
      subscription_id: "sub-circular",
      notifications: circularNotifications,
    } as unknown as McpNegotiatedSubscription;

    expect(() => state.register("server-1", nonSerializable)).not.toThrow();
    expect(state.register("server-1", nonSerializable)).toMatchObject({
      ok: false,
      error: { code: "NOVA-CFG001" },
    });
    expect(state.get("server-1", "sub-1")).toMatchObject({
      ok: true,
      value: { subscription_id: "sub-1", notifications: negotiated.notifications },
    });
    expect(state.get("server-1", "sub-circular")).toEqual({
      ok: true,
      value: { server_id: "server-1", status: "miss" },
    });
  });

  it("rejects unknown notification-filter fields without mutating active state", () => {
    const state = new McpSubscriptionState();
    state.register("server-1", negotiated);
    const unsupported = {
      subscription_id: "sub-unsupported",
      notifications: { tools_list_changed: true, observed_metadata: "untrusted" },
    } as unknown as McpNegotiatedSubscription;

    expect(state.register("server-1", unsupported)).toMatchObject({
      ok: false,
      error: { code: "NOVA-CFG001" },
    });
    expect(state.get("server-1", "sub-1")).toMatchObject({
      ok: true,
      value: { subscription_id: "sub-1", notifications: negotiated.notifications },
    });
    expect(state.get("server-1", "sub-unsupported")).toEqual({
      ok: true,
      value: { server_id: "server-1", status: "miss" },
    });
  });

  it("removes only the matching server-scoped subscription on validated completion", () => {
    const state = new McpSubscriptionState();
    state.register("server-1", negotiated);
    state.register("server-2", negotiated);

    expect(
      state.complete("server-1", {
        jsonrpc: "2.0",
        id: "sub-1",
        result: {
          resultType: "complete",
          _meta: { "io.modelcontextprotocol/subscriptionId": "sub-1" },
        },
      }),
    ).toEqual({
      ok: true,
      value: { server_id: "server-1", subscription_id: "sub-1", status: "completed" },
    });
    expect(state.get("server-1", "sub-1")).toEqual({
      ok: true,
      value: { server_id: "server-1", status: "miss" },
    });
    expect(state.get("server-2", "sub-1")).toMatchObject({
      ok: true,
      value: { subscription_id: "sub-1" },
    });
  });

  it("removes only the matching server-scoped subscription on validated cancellation", () => {
    const state = new McpSubscriptionState();
    state.register("server-1", negotiated);
    state.register("server-2", negotiated);

    expect(
      state.cancel("server-1", {
        jsonrpc: "2.0",
        method: "notifications/cancelled",
        params: { requestId: "sub-1", reason: "user stopped listening" },
      }),
    ).toEqual({
      ok: true,
      value: { server_id: "server-1", subscription_id: "sub-1", status: "cancelled" },
    });
    expect(state.get("server-1", "sub-1")).toEqual({
      ok: true,
      value: { server_id: "server-1", status: "miss" },
    });
    expect(state.get("server-2", "sub-1")).toMatchObject({
      ok: true,
      value: { subscription_id: "sub-1" },
    });
  });

  it("rejects malformed or unknown completions without mutating active state", () => {
    const state = new McpSubscriptionState();
    state.register("server-1", negotiated);

    expect(state.complete("bad server", {})).toMatchObject({
      ok: false,
      error: { code: "NOVA-CFG001" },
    });
    expect(
      state.complete("server-1", {
        jsonrpc: "2.0",
        id: "other",
        result: {
          resultType: "complete",
          _meta: { "io.modelcontextprotocol/subscriptionId": "other" },
        },
      }),
    ).toMatchObject({ ok: false, error: { code: "NOVA-CFG001" } });
    expect(
      state.complete("server-1", {
        jsonrpc: "2.0",
        id: "sub-1",
        result: {
          resultType: "in_progress",
          _meta: { "io.modelcontextprotocol/subscriptionId": "sub-1" },
        },
      }),
    ).toMatchObject({ ok: false, error: { code: "NOVA-TL002" } });
    expect(state.get("server-1", "sub-1")).toMatchObject({
      ok: true,
      value: { subscription_id: "sub-1" },
    });
    expect(
      state.cancel("server-1", {
        jsonrpc: "2.0",
        method: "notifications/cancelled",
        params: { requestId: "other" },
      }),
    ).toMatchObject({ ok: false, error: { code: "NOVA-CFG001" } });
    expect(state.get("server-1", "sub-1")).toMatchObject({
      ok: true,
      value: { subscription_id: "sub-1" },
    });
  });
});
