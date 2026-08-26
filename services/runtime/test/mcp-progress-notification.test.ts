import { describe, expect, it } from "vitest";
import { McpProgressNotificationClassifier } from "../src/mcp-progress-notification.js";

describe("McpProgressNotificationClassifier", () => {
  it("normalizes a bounded progress notification without exposing unknown metadata", () => {
    const classifier = new McpProgressNotificationClassifier();

    expect(
      classifier.parse({
        jsonrpc: "2.0",
        method: "notifications/progress",
        params: {
          progressToken: "request-1",
          progress: 50,
          total: 100,
          message: "Working",
          serverId: "untrusted-server",
        },
      }),
    ).toEqual({
      ok: true,
      value: {
        method: "notifications/progress",
        progressToken: "request-1",
        progress: 50,
        total: 100,
        message: "Working",
      },
    });
  });

  it("accepts string or integer progress tokens and omits optional fields when absent", () => {
    const classifier = new McpProgressNotificationClassifier();

    expect(
      classifier.parse({
        jsonrpc: "2.0",
        method: "notifications/progress",
        params: { progressToken: 7, progress: 0.25 },
      }),
    ).toEqual({
      ok: true,
      value: {
        method: "notifications/progress",
        progressToken: 7,
        progress: 0.25,
      },
    });
  });

  it("rejects malformed notifications, invalid numeric values, and oversized messages", () => {
    const classifier = new McpProgressNotificationClassifier();

    expect(
      classifier.parse({ jsonrpc: "2.0", method: "notifications/progress", id: 1, params: {} }),
    ).toMatchObject({ ok: false, error: { code: "NOVA-TL002" } });
    expect(
      classifier.parse({
        jsonrpc: "2.0",
        method: "notifications/progress",
        params: { progressToken: "request-1", progress: -1 },
      }),
    ).toMatchObject({ ok: false, error: { code: "NOVA-TL002" } });
    expect(
      classifier.parse({
        jsonrpc: "2.0",
        method: "notifications/progress",
        params: { progressToken: "request-1", progress: 1, total: Infinity },
      }),
    ).toMatchObject({ ok: false, error: { code: "NOVA-TL002" } });
    expect(
      classifier.parse({
        jsonrpc: "2.0",
        method: "notifications/progress",
        params: { progressToken: "request-1", progress: 1, message: "x".repeat(2_049) },
      }),
    ).toMatchObject({ ok: false, error: { code: "NOVA-TL002" } });
    expect(
      classifier.parse({
        jsonrpc: "2.0",
        method: "notifications/progress",
        params: { progressToken: "request-1", progress: 1 },
      }),
    ).toMatchObject({ ok: true });
  });
});
