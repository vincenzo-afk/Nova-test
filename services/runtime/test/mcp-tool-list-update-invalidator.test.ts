import { describe, expect, it } from "vitest";
import { McpToolCache } from "../src/mcp-tool-cache.js";
import { McpToolListUpdateInvalidator } from "../src/mcp-tool-list-update-invalidator.js";
import type { McpToolsListResult } from "../src/mcp-tools-list-response.js";

const tools: McpToolsListResult = {
  tools: [{ name: "lookup", inputSchema: { type: "object" } }],
  ttl_ms: 5_000,
  cache_scope: "public",
  rejected_tool_names: [],
};

describe("McpToolListUpdateInvalidator", () => {
  it("invalidates only the notified server's tool listing", () => {
    const cache = new McpToolCache({ now: () => 1_000 });
    const invalidator = new McpToolListUpdateInvalidator(cache);

    cache.put("server-1", tools);
    cache.put("server-2", tools);

    expect(
      invalidator.apply("server-1", {
        jsonrpc: "2.0",
        method: "notifications/tools/list_changed",
      }),
    ).toEqual({
      ok: true,
      value: { server_id: "server-1", status: "invalidated" },
    });
    expect(cache.get("server-1")).toEqual({
      ok: true,
      value: { server_id: "server-1", status: "miss" },
    });
    expect(cache.get("server-2")).toEqual({ ok: true, value: tools });
  });

  it("fails closed on a non-string server ID without throwing or invalidating cache state", () => {
    const cache = new McpToolCache({ now: () => 1_000 });
    const invalidator = new McpToolListUpdateInvalidator(cache);
    cache.put("server-1", tools);
    const invalidServerId = {
      toString(): string {
        throw new Error("toString should not run for an untrusted server ID");
      },
    } as unknown as string;

    expect(() =>
      invalidator.apply(invalidServerId, {
        jsonrpc: "2.0",
        method: "notifications/tools/list_changed",
      }),
    ).not.toThrow();
    expect(
      invalidator.apply(invalidServerId, {
        jsonrpc: "2.0",
        method: "notifications/tools/list_changed",
      }),
    ).toMatchObject({ ok: false, error: { code: "NOVA-CFG001" } });
    expect(cache.get("server-1")).toEqual({ ok: true, value: tools });
  });

  it("rejects malformed notifications and server IDs without mutating the cache", () => {
    const cache = new McpToolCache({ now: () => 1_000 });
    const invalidator = new McpToolListUpdateInvalidator(cache);
    cache.put("server-1", tools);

    expect(
      invalidator.apply("bad server", {
        jsonrpc: "2.0",
        method: "notifications/tools/list_changed",
      }),
    ).toMatchObject({ ok: false, error: { code: "NOVA-CFG001" } });
    expect(
      invalidator.apply("server-1", {
        jsonrpc: "2.0",
        id: 1,
        method: "notifications/tools/list_changed",
      }),
    ).toMatchObject({ ok: false, error: { code: "NOVA-TL002" } });
    expect(cache.get("server-1")).toEqual({ ok: true, value: tools });
  });
});
