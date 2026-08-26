import { describe, expect, it } from "vitest";
import { McpResourceCache } from "../src/mcp-resource-cache.js";
import { McpResourceUpdateInvalidator } from "../src/mcp-resource-update-invalidator.js";
import type { McpResourcesReadResult } from "../src/mcp-resources-read-response.js";

const resource: McpResourcesReadResult = {
  contents: [{ uri: "https://example.test/data", text: "hello" }],
  ttl_ms: 5_000,
  rejected_content_uris: [],
};

describe("McpResourceUpdateInvalidator", () => {
  it("invalidates only the notified server and URI", () => {
    const cache = new McpResourceCache({ now: () => 1_000 });
    const invalidator = new McpResourceUpdateInvalidator(cache);

    cache.put("server-1", resource);
    cache.put("server-2", resource);

    expect(
      invalidator.apply("server-1", {
        jsonrpc: "2.0",
        method: "notifications/resources/updated",
        params: { uri: resource.contents[0].uri },
      }),
    ).toEqual({
      ok: true,
      value: {
        server_id: "server-1",
        uri: resource.contents[0].uri,
        status: "invalidated",
      },
    });
    expect(cache.get("server-1", resource.contents[0].uri)).toMatchObject({
      ok: true,
      value: { status: "miss" },
    });
    expect(cache.get("server-2", resource.contents[0].uri)).toEqual({ ok: true, value: resource });
  });

  it("rejects malformed notifications and server IDs without mutating the cache", () => {
    const cache = new McpResourceCache({ now: () => 1_000 });
    const invalidator = new McpResourceUpdateInvalidator(cache);
    cache.put("server-1", resource);

    expect(
      invalidator.apply("bad server", {
        jsonrpc: "2.0",
        method: "notifications/resources/updated",
        params: { uri: resource.contents[0].uri },
      }),
    ).toMatchObject({ ok: false, error: { code: "NOVA-CFG001" } });
    expect(
      invalidator.apply("server-1", {
        jsonrpc: "2.0",
        method: "notifications/resources/updated",
        params: { uri: "file:///tmp/../secret" },
      }),
    ).toMatchObject({ ok: false, error: { code: "NOVA-TL002" } });
    expect(cache.get("server-1", resource.contents[0].uri)).toEqual({ ok: true, value: resource });
  });
});
