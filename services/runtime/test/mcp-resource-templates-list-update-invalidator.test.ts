import { describe, expect, it } from "vitest";
import type { McpResourcesTemplatesListResult } from "../src/mcp-resources-templates-list-response.js";
import { McpResourceTemplatesListCache } from "../src/mcp-resource-templates-list-cache.js";
import { McpResourceTemplatesListUpdateInvalidator } from "../src/mcp-resource-templates-list-update-invalidator.js";

const templates: McpResourcesTemplatesListResult = {
  resource_templates: [{ uri_template: "https://example.test/docs/{name}", name: "document" }],
  ttl_ms: 5_000,
  cache_scope: "public",
  rejected_template_names: [],
};

describe("McpResourceTemplatesListUpdateInvalidator", () => {
  it("invalidates only the notified server's resource-template listing", () => {
    const cache = new McpResourceTemplatesListCache({ now: () => 1_000 });
    const invalidator = new McpResourceTemplatesListUpdateInvalidator(cache);

    cache.put("server-1", templates);
    cache.put("server-2", templates);

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
    expect(cache.get("server-2")).toEqual({ ok: true, value: templates });
  });

  it("rejects other capabilities, malformed notifications, and server IDs without mutation", () => {
    const cache = new McpResourceTemplatesListCache({ now: () => 1_000 });
    const invalidator = new McpResourceTemplatesListUpdateInvalidator(cache);
    cache.put("server-1", templates);

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
    expect(cache.get("server-1")).toEqual({ ok: true, value: templates });
  });
});
