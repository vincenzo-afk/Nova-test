import { describe, expect, it } from "vitest";
import { McpResourceCache } from "../src/mcp-resource-cache.js";
import type { McpResourcesReadResult } from "../src/mcp-resources-read-response.js";

const resource: McpResourcesReadResult = {
  contents: [{ uri: "https://example.test/data", mime_type: "text/plain", text: "hello" }],
  ttl_ms: 5_000,
  cache_scope: "private",
  rejected_content_uris: [],
};

describe("McpResourceCache", () => {
  it("returns a cached resource result before TTL expiry and clones content", () => {
    let now = 1_000;
    const cache = new McpResourceCache({ now: () => now });

    expect(cache.put("server-1", resource)).toMatchObject({ ok: true });
    const first = cache.get("server-1", resource.contents[0].uri);
    expect(first).toEqual({ ok: true, value: resource });
    if (!first.ok) throw new Error("expected cache hit");
    const firstContent = first.value.contents[0];
    expect(firstContent).toBeDefined();
    if (firstContent === undefined) throw new Error("expected cached content");
    (firstContent as { text?: string }).text = "mutated";
    now = 5_999;
    expect(cache.get("server-1", resource.contents[0].uri)).toEqual({ ok: true, value: resource });
  });

  it("fails closed on a non-cloneable value without mutating existing entries", () => {
    const cache = new McpResourceCache({ now: () => 1_000 });
    const circularContent: Record<string, unknown> = {
      uri: "https://example.test/data",
      text: "hello",
    };
    circularContent.self = circularContent;
    const nonCloneable = {
      ...resource,
      contents: [circularContent],
    } as unknown as McpResourcesReadResult;

    expect(cache.put("server-1", resource)).toMatchObject({ ok: true });
    expect(() => cache.put("server-1", nonCloneable)).not.toThrow();
    expect(cache.put("server-1", nonCloneable)).toMatchObject({
      ok: false,
      error: { code: "NOVA-CFG001" },
    });
    expect(cache.get("server-1", resource.contents[0].uri)).toEqual({
      ok: true,
      value: resource,
    });
  });

  it("expires entries at TTL and invalidates only the requested server and URI", () => {
    let now = 1_000;
    const cache = new McpResourceCache({ now: () => now });
    const other: McpResourcesReadResult = {
      ...resource,
      contents: [{ uri: "https://example.test/other", text: "other" }],
    };

    cache.put("server-1", resource);
    cache.put("server-2", other);
    expect(cache.invalidate("server-1", resource.contents[0].uri)).toMatchObject({ ok: true });
    expect(cache.get("server-1", resource.contents[0].uri)).toEqual({
      ok: true,
      value: { server_id: "server-1", uri: resource.contents[0].uri, status: "miss" },
    });
    expect(cache.get("server-2", other.contents[0].uri)).toEqual({ ok: true, value: other });
    now = 6_000;
    expect(cache.get("server-2", other.contents[0].uri)).toEqual({
      ok: true,
      value: { server_id: "server-2", uri: other.contents[0].uri, status: "miss" },
    });
  });

  it("replaces a source and rejects invalid identifiers, URIs, and results", () => {
    const cache = new McpResourceCache({ now: () => 1_000 });
    const replacement: McpResourcesReadResult = {
      ...resource,
      contents: [{ uri: resource.contents[0].uri, text: "replacement" }],
    };

    expect(cache.put("server-1", resource)).toMatchObject({ ok: true });
    expect(cache.put("server-1", replacement)).toMatchObject({ ok: true });
    expect(cache.get("server-1", resource.contents[0].uri)).toEqual({
      ok: true,
      value: replacement,
    });
    expect(cache.put("bad server", resource)).toMatchObject({
      ok: false,
      error: { code: "NOVA-CFG001" },
    });
    expect(cache.get("server-1", "file:///tmp/../secret")).toMatchObject({
      ok: false,
      error: { code: "NOVA-CFG001" },
    });
    expect(cache.invalidate("server-1", "https://example.test/missing")).toMatchObject({
      ok: true,
    });
    expect(cache.put("server-1", { ...resource, ttl_ms: 0 })).toMatchObject({
      ok: false,
      error: { code: "NOVA-CFG001" },
    });
    expect(
      cache.put("server-1", {
        ...resource,
        rejected_content_uris: ["not-a-safe-uri"],
      }),
    ).toMatchObject({
      ok: false,
      error: { code: "NOVA-CFG001" },
    });
    expect(
      cache.put("server-1", {
        ...resource,
        rejected_content_uris: Array.from(
          { length: 129 },
          (_, index) => `https://example.test/rejected/${index}`,
        ),
      }),
    ).toMatchObject({
      ok: false,
      error: { code: "NOVA-CFG001" },
    });
  });
});
