import { describe, expect, it } from "vitest";
import type { McpResourcesListResult } from "../src/mcp-resources-list-response.js";
import { McpResourceListCache } from "../src/mcp-resource-list-cache.js";

const resources: McpResourcesListResult = {
  resources: [
    {
      uri: "https://example.test/docs/readme",
      name: "readme",
      title: "README",
      mime_type: "text/markdown",
      size_bytes: 128,
    },
  ],
  next_cursor: "next",
  ttl_ms: 100,
  cache_scope: "public",
  rejected_resource_uris: [],
};

describe("McpResourceListCache", () => {
  it("stores resource metadata per server and isolates caller mutations", () => {
    const cache = new McpResourceListCache({ now: () => 1_000 });
    expect(cache.put("server-1", resources)).toEqual({ ok: true, value: undefined });
    expect(cache.put("server-2", resources)).toEqual({ ok: true, value: undefined });

    const first = cache.get("server-1");
    expect(first).toEqual({ ok: true, value: resources });
    if (first.ok && "resources" in first.value) {
      const resource = first.value.resources.at(0);
      if (resource) resource.name = "mutated";
    }
    expect(cache.get("server-1")).toEqual({ ok: true, value: resources });
    expect(cache.get("server-2")).toEqual({ ok: true, value: resources });
  });

  it("expires entries at the bounded TTL and replaces a listing atomically", () => {
    let now = 1_000;
    const cache = new McpResourceListCache({ now: () => now });
    cache.put("server-1", resources);

    const replacement: McpResourcesListResult = {
      resources: [{ uri: "https://example.test/docs/new", name: "new" }],
      rejected_resource_uris: [],
    };
    expect(cache.put("server-1", replacement)).toEqual({ ok: true, value: undefined });
    expect(cache.get("server-1")).toEqual({ ok: true, value: replacement });

    now = 301_000;
    expect(cache.get("server-1")).toEqual({
      ok: true,
      value: { server_id: "server-1", status: "miss" },
    });
  });

  it("rejects malformed server IDs and resource results without mutating valid entries", () => {
    const cache = new McpResourceListCache({ now: () => 1_000 });
    cache.put("server-1", resources);

    expect(cache.put("bad server", resources)).toMatchObject({
      ok: false,
      error: { code: "NOVA-CFG001" },
    });
    expect(
      cache.put("server-2", {
        resources: [
          { uri: "https://example.test/a", name: "a" },
          { uri: "https://example.test/a", name: "duplicate" },
        ],
        rejected_resource_uris: [],
      } as McpResourcesListResult),
    ).toMatchObject({ ok: false, error: { code: "NOVA-CFG001" } });
    expect(cache.get("bad server")).toMatchObject({
      ok: false,
      error: { code: "NOVA-CFG001" },
    });
    expect(cache.get("server-1")).toEqual({ ok: true, value: resources });
  });
});
