import { describe, expect, it } from "vitest";
import { McpListChangedNotificationClassifier } from "../src/mcp-list-changed-notification.js";

describe("McpListChangedNotificationClassifier", () => {
  it("normalizes supported resource and prompt list-changed notifications", () => {
    const classifier = new McpListChangedNotificationClassifier();

    expect(
      classifier.parse({
        jsonrpc: "2.0",
        method: "notifications/resources/list_changed",
      }),
    ).toEqual({
      ok: true,
      value: { capability: "resources", method: "notifications/resources/list_changed" },
    });
    expect(
      classifier.parse({
        jsonrpc: "2.0",
        method: "notifications/prompts/list_changed",
        params: { ignored: "not forwarded" },
      }),
    ).toEqual({
      ok: true,
      value: { capability: "prompts", method: "notifications/prompts/list_changed" },
    });
  });

  it("does not expose notification parameters or treat a notification as a refresh", () => {
    const classifier = new McpListChangedNotificationClassifier();
    const notification = {
      jsonrpc: "2.0",
      method: "notifications/resources/list_changed",
      params: { serverId: "secret-server", cursor: "secret-cursor" },
    };

    const result = classifier.parse(notification);
    notification.params.serverId = "mutated";

    expect(result).toEqual({
      ok: true,
      value: { capability: "resources", method: "notifications/resources/list_changed" },
    });
    expect(JSON.stringify(result)).not.toContain("secret-server");
    expect(JSON.stringify(result)).not.toContain("secret-cursor");
  });

  it("rejects responses, malformed JSON-RPC messages, unsupported methods, and oversized payloads", () => {
    const classifier = new McpListChangedNotificationClassifier();

    expect(
      classifier.parse({ jsonrpc: "2.0", id: 1, method: "notifications/resources/list_changed" }),
    ).toMatchObject({
      ok: false,
      error: { code: "NOVA-TL002" },
    });
    expect(
      classifier.parse({ jsonrpc: "2.0", method: "notifications/tools/list_changed" }),
    ).toMatchObject({
      ok: false,
      error: { code: "NOVA-TL002" },
    });
    expect(
      classifier.parse({ jsonrpc: "1.0", method: "notifications/prompts/list_changed" }),
    ).toMatchObject({
      ok: false,
      error: { code: "NOVA-TL002" },
    });
    expect(
      classifier.parse({
        jsonrpc: "2.0",
        method: "notifications/resources/list_changed",
        params: { payload: "x".repeat(131_073) },
      }),
    ).toMatchObject({ ok: false, error: { code: "NOVA-TL002" } });
  });
});
