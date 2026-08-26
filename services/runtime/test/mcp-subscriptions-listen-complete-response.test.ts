import { describe, expect, it } from "vitest";
import { McpSubscriptionsListenCompleteResponseValidator } from "../src/mcp-subscriptions-listen-complete-response.js";

describe("McpSubscriptionsListenCompleteResponseValidator", () => {
  it("normalizes a correlated graceful subscription completion", () => {
    const validator = new McpSubscriptionsListenCompleteResponseValidator();

    expect(
      validator.parse({
        jsonrpc: "2.0",
        id: 7,
        result: {
          resultType: "complete",
          _meta: { "io.modelcontextprotocol/subscriptionId": 7 },
        },
      }),
    ).toEqual({
      ok: true,
      value: {
        request_id: 7,
        subscription_id: 7,
        result_type: "complete",
      },
    });
  });

  it("accepts string request IDs and discards untrusted completion metadata", () => {
    const validator = new McpSubscriptionsListenCompleteResponseValidator();

    expect(
      validator.parse({
        jsonrpc: "2.0",
        id: "listen-1",
        result: {
          resultType: "complete",
          _meta: {
            "io.modelcontextprotocol/subscriptionId": "listen-1",
            reason: "server secret",
          },
          ignored: "not forwarded",
        },
      }),
    ).toEqual({
      ok: true,
      value: {
        request_id: "listen-1",
        subscription_id: "listen-1",
        result_type: "complete",
      },
    });
  });

  it("rejects mismatched correlation, incomplete results, malformed messages, and oversized metadata", () => {
    const validator = new McpSubscriptionsListenCompleteResponseValidator();

    expect(
      validator.parse({
        jsonrpc: "2.0",
        id: 7,
        result: {
          resultType: "complete",
          _meta: { "io.modelcontextprotocol/subscriptionId": 8 },
        },
      }),
    ).toMatchObject({ ok: false, error: { code: "NOVA-TL002" } });
    expect(
      validator.parse({
        jsonrpc: "2.0",
        id: 7,
        result: {
          resultType: "complete",
          _meta: { "io.modelcontextprotocol/subscriptionId": 7 },
          payload: "x".repeat(131_073),
        },
      }),
    ).toMatchObject({ ok: false, error: { code: "NOVA-TL002" } });
    expect(
      validator.parse({
        jsonrpc: "2.0",
        id: 7,
        result: {
          resultType: "partial",
          _meta: { "io.modelcontextprotocol/subscriptionId": 7 },
        },
      }),
    ).toMatchObject({ ok: false, error: { code: "NOVA-TL002" } });
    expect(
      validator.parse({
        jsonrpc: "2.0",
        id: 7,
        error: { code: -1, message: "failure" },
      }),
    ).toMatchObject({ ok: false, error: { code: "NOVA-TL002" } });
  });
});
