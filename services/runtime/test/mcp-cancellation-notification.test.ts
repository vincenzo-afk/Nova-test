import { describe, expect, it } from "vitest";
import { McpCancellationNotificationClassifier } from "../src/mcp-cancellation-notification.js";

describe("McpCancellationNotificationClassifier", () => {
  it("normalizes a cancellation notification with a bounded reason", () => {
    const classifier = new McpCancellationNotificationClassifier();

    expect(
      classifier.parse({
        jsonrpc: "2.0",
        method: "notifications/cancelled",
        params: {
          requestId: "request-1",
          reason: "User requested cancellation",
          secret: "not forwarded",
        },
      }),
    ).toEqual({
      ok: true,
      value: {
        method: "notifications/cancelled",
        request_id: "request-1",
        reason: "User requested cancellation",
      },
    });
  });

  it("accepts numeric request IDs and omits an absent reason", () => {
    const classifier = new McpCancellationNotificationClassifier();

    expect(
      classifier.parse({
        jsonrpc: "2.0",
        method: "notifications/cancelled",
        params: { requestId: 7 },
      }),
    ).toEqual({
      ok: true,
      value: { method: "notifications/cancelled", request_id: 7 },
    });
  });

  it("rejects responses, malformed request IDs, invalid reasons, and oversized payloads", () => {
    const classifier = new McpCancellationNotificationClassifier();

    expect(
      classifier.parse({
        jsonrpc: "2.0",
        id: 1,
        method: "notifications/cancelled",
        params: { requestId: 1 },
      }),
    ).toMatchObject({ ok: false, error: { code: "NOVA-TL002" } });
    expect(
      classifier.parse({
        jsonrpc: "2.0",
        method: "notifications/cancelled",
        params: { requestId: "" },
      }),
    ).toMatchObject({ ok: false, error: { code: "NOVA-TL002" } });
    expect(
      classifier.parse({
        jsonrpc: "2.0",
        method: "notifications/cancelled",
        params: { requestId: { id: 1 } },
      }),
    ).toMatchObject({ ok: false, error: { code: "NOVA-TL002" } });
    expect(
      classifier.parse({
        jsonrpc: "2.0",
        method: "notifications/cancelled",
        params: { requestId: 1, reason: 42 },
      }),
    ).toMatchObject({ ok: false, error: { code: "NOVA-TL002" } });
    expect(
      classifier.parse({
        jsonrpc: "2.0",
        method: "notifications/cancelled",
        params: { requestId: 1, reason: "x".repeat(2_049) },
      }),
    ).toMatchObject({ ok: false, error: { code: "NOVA-TL002" } });
  });
});
