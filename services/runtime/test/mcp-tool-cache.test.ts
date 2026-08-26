import { describe, expect, it } from "vitest";
import { McpToolCache } from "../src/mcp-tool-cache.js";
import type { McpToolsListResult } from "../src/mcp-tools-list-response.js";

const tools: McpToolsListResult = {
  tools: [
    {
      name: "lookup",
      inputSchema: { type: "object" },
    },
  ],
  next_cursor: "next",
  ttl_ms: 5_000,
  cache_scope: "public",
  rejected_tool_names: [],
};

describe("McpToolCache", () => {
  it("returns a cached tool list before TTL expiry and clones the result", () => {
    let now = 1_000;
    const cache = new McpToolCache({ now: () => now });

    expect(cache.put("server-1", tools)).toMatchObject({ ok: true });
    const first = cache.get("server-1");
    expect(first).toEqual({ ok: true, value: tools });
    if (!first.ok) throw new Error("expected cache hit");
    const firstTool = first.value.tools[0];
    expect(firstTool).toBeDefined();
    if (firstTool === undefined) throw new Error("expected a cached tool");
    (firstTool.inputSchema as { type: string }).type = "mutated";
    now = 5_999;
    expect(cache.get("server-1")).toEqual({ ok: true, value: tools });
  });

  it("fails closed on a non-cloneable value without mutating the existing entry", () => {
    const cache = new McpToolCache({ now: () => 1_000 });
    const circularSchema: Record<string, unknown> = { type: "object" };
    circularSchema.self = circularSchema;
    const nonCloneable = {
      ...tools,
      tools: [{ name: "lookup", inputSchema: circularSchema }],
    } as unknown as McpToolsListResult;

    expect(cache.put("server-1", tools)).toMatchObject({ ok: true });
    expect(() => cache.put("server-1", nonCloneable)).not.toThrow();
    expect(cache.put("server-1", nonCloneable)).toMatchObject({
      ok: false,
      error: { code: "NOVA-CFG001" },
    });
    expect(cache.get("server-1")).toEqual({ ok: true, value: tools });
  });

  it("expires cached entries at their TTL and reports a cache miss", () => {
    let now = 1_000;
    const cache = new McpToolCache({ now: () => now });

    cache.put("server-1", tools);
    now = 6_000;
    expect(cache.get("server-1")).toEqual({
      ok: true,
      value: { server_id: "server-1", status: "miss" },
    });
  });

  it("replaces a server page atomically and invalidates only the requested source", () => {
    const cache = new McpToolCache({ now: () => 1_000 });
    const replacement: McpToolsListResult = {
      ...tools,
      tools: [{ name: "replacement", inputSchema: { type: "object" } }],
    };

    expect(cache.put("server-1", tools)).toMatchObject({ ok: true });
    expect(cache.put("server-2", tools)).toMatchObject({ ok: true });
    expect(cache.put("server-1", replacement)).toMatchObject({ ok: true });
    expect(cache.get("server-1")).toEqual({ ok: true, value: replacement });
    expect(cache.invalidate("server-1")).toMatchObject({ ok: true });
    expect(cache.get("server-1")).toMatchObject({
      ok: true,
      value: { server_id: "server-1", status: "miss" },
    });
    expect(cache.get("server-2")).toMatchObject({ ok: true, value: tools });
    expect(
      cache.put("server-1", {
        ...tools,
        rejected_tool_names: ["unsafe tool name"],
      }),
    ).toMatchObject({
      ok: false,
      error: { code: "NOVA-CFG001" },
    });
    expect(
      cache.put("server-1", {
        ...tools,
        next_cursor: "x".repeat(257),
      }),
    ).toMatchObject({
      ok: false,
      error: { code: "NOVA-CFG001" },
    });
    expect(
      cache.put("server-1", {
        ...tools,
        tools: Array.from({ length: 129 }, (_, index) => ({
          name: `tool_${index}`,
          inputSchema: { type: "object" },
        })),
      }),
    ).toMatchObject({
      ok: false,
      error: { code: "NOVA-CFG001" },
    });
    expect(
      cache.put("server-1", {
        ...tools,
        rejected_tool_names: Array.from({ length: 129 }, (_, index) => `rejected_${index}`),
      }),
    ).toMatchObject({
      ok: false,
      error: { code: "NOVA-CFG001" },
    });
  });
});
