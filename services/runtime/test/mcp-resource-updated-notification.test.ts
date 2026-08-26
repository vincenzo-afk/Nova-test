import { describe, expect, it } from "vitest";
import { McpResourceUpdatedNotificationClassifier } from "../src/mcp-resource-updated-notification.js";

describe("McpResourceUpdatedNotificationClassifier", () => {
  it("normalizes a safe correlated resource update notification", () => {
    const classifier = new McpResourceUpdatedNotificationClassifier();

    expect(
      classifier.parse({
        jsonrpc: "2.0",
        method: "notifications/resources/updated",
        params: { uri: "file:///project/README.md" },
      }),
    ).toEqual({
      ok: true,
      value: {
        method: "notifications/resources/updated",
        uri: "file:///project/README.md",
      },
    });
  });

  it("discards subscription and notification metadata instead of exposing it", () => {
    const classifier = new McpResourceUpdatedNotificationClassifier();
    const notification = {
      jsonrpc: "2.0",
      method: "notifications/resources/updated",
      params: {
        uri: "https://example.test/resource",
        _meta: { "io.modelcontextprotocol/subscriptionId": 4 },
        serverId: "secret-server",
      },
    };

    const result = classifier.parse(notification);
    notification.params.serverId = "mutated";

    expect(result).toEqual({
      ok: true,
      value: {
        method: "notifications/resources/updated",
        uri: "https://example.test/resource",
      },
    });
    expect(JSON.stringify(result)).not.toContain("secret-server");
    expect(JSON.stringify(result)).not.toContain("subscriptionId");
  });

  it("rejects malformed JSON-RPC messages, unsafe URIs, and oversized payloads", () => {
    const classifier = new McpResourceUpdatedNotificationClassifier();

    expect(
      classifier.parse({ jsonrpc: "2.0", method: "notifications/resources/updated" }),
    ).toMatchObject({
      ok: false,
      error: { code: "NOVA-TL002" },
    });
    expect(
      classifier.parse({
        jsonrpc: "2.0",
        method: "notifications/resources/updated",
        params: { uri: "file:///project/../secret.txt" },
      }),
    ).toMatchObject({ ok: false, error: { code: "NOVA-TL002" } });
    expect(
      classifier.parse({
        jsonrpc: "2.0",
        method: "notifications/resources/updated",
        params: { uri: "https://user:password@example.test/resource" },
      }),
    ).toMatchObject({ ok: false, error: { code: "NOVA-TL002" } });
    expect(
      classifier.parse({
        jsonrpc: "2.0",
        method: "notifications/resources/updated",
        params: { uri: "file:///" + "x".repeat(2_049) },
      }),
    ).toMatchObject({ ok: false, error: { code: "NOVA-TL002" } });
  });
});
