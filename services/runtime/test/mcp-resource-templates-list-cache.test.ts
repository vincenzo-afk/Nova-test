import { describe, expect, it } from "vitest";
import type { McpResourcesTemplatesListResult } from "../src/mcp-resources-templates-list-response.js";
import { McpResourceTemplatesListCache } from "../src/mcp-resource-templates-list-cache.js";

const templates: McpResourcesTemplatesListResult = {
  resource_templates: [
    {
      uri_template: "https://example.test/docs/{name}",
      name: "document",
      title: "Document",
      description: "A document resource.",
      mime_type: "text/plain",
    },
  ],
  next_cursor: "next",
  ttl_ms: 100,
  cache_scope: "public",
  rejected_template_names: [],
};

describe("McpResourceTemplatesListCache", () => {
  it("stores template metadata per server and isolates caller mutations", () => {
    const cache = new McpResourceTemplatesListCache({ now: () => 1_000 });
    expect(cache.put("server-1", templates)).toEqual({ ok: true, value: undefined });
    expect(cache.put("server-2", templates)).toEqual({ ok: true, value: undefined });

    const first = cache.get("server-1");
    expect(first).toEqual({ ok: true, value: templates });
    if (first.ok && "resource_templates" in first.value) {
      const template = first.value.resource_templates.at(0);
      if (template) template.name = "mutated";
    }
    expect(cache.get("server-1")).toEqual({ ok: true, value: templates });
    expect(cache.get("server-2")).toEqual({ ok: true, value: templates });
  });

  it("fails closed on a non-cloneable value without mutating the existing entry", () => {
    const cache = new McpResourceTemplatesListCache({ now: () => 1_000 });
    const circularTemplate: Record<string, unknown> = {
      uri_template: "https://example.test/docs/{name}",
      name: "document",
    };
    circularTemplate.self = circularTemplate;
    const nonCloneable = {
      ...templates,
      resource_templates: [circularTemplate],
    } as unknown as McpResourcesTemplatesListResult;

    expect(cache.put("server-1", templates)).toMatchObject({ ok: true });
    expect(() => cache.put("server-1", nonCloneable)).not.toThrow();
    expect(cache.put("server-1", nonCloneable)).toMatchObject({
      ok: false,
      error: { code: "NOVA-CFG001" },
    });
    expect(cache.get("server-1")).toEqual({ ok: true, value: templates });
  });

  it("expires entries at the bounded TTL and replaces a listing atomically", () => {
    let now = 1_000;
    const cache = new McpResourceTemplatesListCache({ now: () => now });
    cache.put("server-1", templates);

    const replacement: McpResourcesTemplatesListResult = {
      resource_templates: [],
      rejected_template_names: [],
    };
    expect(cache.put("server-1", replacement)).toEqual({ ok: true, value: undefined });
    expect(cache.get("server-1")).toEqual({ ok: true, value: replacement });

    now = 301_000;
    expect(cache.get("server-1")).toEqual({
      ok: true,
      value: { server_id: "server-1", status: "miss" },
    });
  });

  it("rejects malformed server IDs and template results without mutating valid entries", () => {
    const cache = new McpResourceTemplatesListCache({ now: () => 1_000 });
    cache.put("server-1", templates);

    expect(cache.put("bad server", templates)).toMatchObject({
      ok: false,
      error: { code: "NOVA-CFG001" },
    });
    expect(
      cache.put("server-2", {
        resource_templates: [
          { uri_template: "https://example.test/{name}", name: "one" },
          { uri_template: "https://example.test/{name}", name: "two" },
        ],
        rejected_template_names: [],
      } as McpResourcesTemplatesListResult),
    ).toMatchObject({ ok: false, error: { code: "NOVA-CFG001" } });
    expect(cache.get("bad server")).toMatchObject({
      ok: false,
      error: { code: "NOVA-CFG001" },
    });
    expect(cache.get("server-1")).toEqual({ ok: true, value: templates });
    expect(
      cache.put("server-1", {
        ...templates,
        rejected_template_names: [""],
      }),
    ).toMatchObject({
      ok: false,
      error: { code: "NOVA-CFG001" },
    });
    expect(
      cache.put("server-1", {
        ...templates,
        rejected_template_names: Array.from({ length: 129 }, (_, index) => `rejected_${index}`),
      }),
    ).toMatchObject({
      ok: false,
      error: { code: "NOVA-CFG001" },
    });
  });
});
