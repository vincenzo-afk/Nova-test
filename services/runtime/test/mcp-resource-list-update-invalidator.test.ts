import { describe, expect, it } from "vitest";
import type { McpResourcesListResult } from "../src/mcp-resources-list-response.js";
import { McpResourceListCache } from "../src/mcp-resource-list-cache.js";
import { McpResourceListUpdateInvalidator } from "../src/mcp-resource-list-update-invalidator.js";

const resources: McpResourcesListResult = {
  resources: [{ uri: "https://example.test/docs/readme", name: "readme" }],
  ttl_ms: 5_000,
  cache_scope: "public",
  rejected_resource_uris: [],
};

describe("McpResourceListUpdateInvalidator", () => {
  it("invalidates only the notified server's resource listing", () => {
    const cache = new McpResourceListCache({ now: () => 1_000 });
    const invalidator = new McpResourceListUpdateInvalidator(cache);

    cache.put("server-1", resources);
    cache.put("server-2", resources);

    expect(
      invalidator.apply("server-1", {
        jsonrpc: "2.0",
        method: "notifications/resources/list_changed",
      }),
    ).toEqual({
      ok: true,
      value: { server_id: "server-1", status: "invalidated" },
    });
    expect(cache.get("server-1")).toEqual({
      ok: true,
      value: { server_id: "server-1", status: "miss" },
    });
    expect(cache.get("server-2")).toEqual({ ok: true, value: resources });
  });

  it("rejects other capabilities, malformed notifications, and server IDs without mutation", () => {
    const cache = new McpResourceListCache({ now: () => 1_000 });
    const invalidator = new McpResourceListUpdateInvalidator(cache);
    cache.put("server-1", resources);

    expect(
      invalidator.apply("server-1", {
        jsonrpc: "2.0",
        method: "notifications/tools/list_changed",
      }),
    ).toMatchObject({ ok: false, error: { code: "NOVA-CFG001" } });
    expect(
      invalidator.apply("server-1", {
        jsonrpc: "2.0",
        method: "notifications/prompts/list_changed",
      }),
    ).toMatchObject({ ok: false, error: { code: "NOVA-CFG001" } });
    expect(
      invalidator.apply("server-1", {
        jsonrpc: "2.0",
        id: 1,
        method: "notifications/resources/list_changed",
      }),
    ).toMatchObject({ ok: false, error: { code: "NOVA-TL002" } });
    expect(
      invalidator.apply("bad server", {
        jsonrpc: "2.0",
        method: "notifications/resources/list_changed",
      }),
    ).toMatchObject({ ok: false, error: { code: "NOVA-CFG001" } });
    expect(cache.get("server-1")).toEqual({ ok: true, value: resources });
  });
});
