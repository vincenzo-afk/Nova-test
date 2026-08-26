import { describe, expect, it } from "vitest";
import type { McpServerDiscoverResult } from "../src/mcp-server-discover-response.js";
import { McpServerDiscoveryCache } from "../src/mcp-server-discovery-cache.js";

const discovery: McpServerDiscoverResult = {
  supported_versions: ["2025-06-18"],
  capabilities: { tools: { listChanged: true } },
  server_info: { name: "Example Server", version: "1.0.0" },
  instructions: "Observed server metadata",
  ttl_ms: 100,
  cache_scope: "public",
};

describe("McpServerDiscoveryCache", () => {
  it("stores discovery metadata per server and isolates caller mutations", () => {
    const cache = new McpServerDiscoveryCache({ now: () => 1_000 });
    expect(cache.put("server-1", discovery)).toEqual({ ok: true, value: undefined });
    expect(cache.put("server-2", discovery)).toEqual({ ok: true, value: undefined });

    const first = cache.get("server-1");
    expect(first).toEqual({ ok: true, value: discovery });
    if (first.ok && "capabilities" in first.value) {
      const tools = first.value.capabilities.tools;
      if (isRecord(tools)) tools.listChanged = false;
    }
    expect(cache.get("server-1")).toEqual({ ok: true, value: discovery });
    expect(cache.get("server-2")).toEqual({ ok: true, value: discovery });
  });

  it("expires entries at the bounded TTL and replaces a discovery result atomically", () => {
    let now = 1_000;
    const cache = new McpServerDiscoveryCache({ now: () => now });
    cache.put("server-1", discovery);

    const replacement: McpServerDiscoverResult = {
      supported_versions: ["2025-03-26"],
      capabilities: {},
    };
    expect(cache.put("server-1", replacement)).toEqual({ ok: true, value: undefined });
    expect(cache.get("server-1")).toEqual({ ok: true, value: replacement });

    now = 301_000;
    expect(cache.get("server-1")).toEqual({
      ok: true,
      value: { server_id: "server-1", status: "miss" },
    });
  });

  it("rejects malformed server IDs and discovery results without mutating valid entries", () => {
    const cache = new McpServerDiscoveryCache({ now: () => 1_000 });
    cache.put("server-1", discovery);

    expect(cache.put("bad server", discovery)).toMatchObject({
      ok: false,
      error: { code: "NOVA-CFG001" },
    });
    expect(
      cache.put("server-2", {
        supported_versions: ["2025-06-18", "2025-06-18"],
        capabilities: {},
      } as McpServerDiscoverResult),
    ).toMatchObject({ ok: false, error: { code: "NOVA-CFG001" } });
    expect(cache.get("bad server")).toMatchObject({
      ok: false,
      error: { code: "NOVA-CFG001" },
    });
    expect(cache.get("server-1")).toEqual({ ok: true, value: discovery });
  });
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
