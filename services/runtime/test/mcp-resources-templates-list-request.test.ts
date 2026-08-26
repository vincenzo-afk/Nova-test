import { describe, expect, it } from "vitest";
import { McpResourcesTemplatesListRequestBuilder } from "../src/mcp-resources-templates-list-request.js";

describe("McpResourcesTemplatesListRequestBuilder", () => {
  it("builds a fixed resources/templates/list request without optional parameters", () => {
    const builder = new McpResourcesTemplatesListRequestBuilder();

    expect(builder.create()).toEqual({
      ok: true,
      value: {
        jsonrpc: "2.0",
        id: 1,
        method: "resources/templates/list",
        params: {},
      },
    });
  });

  it("includes a bounded opaque cursor and forwards no unknown fields", () => {
    const builder = new McpResourcesTemplatesListRequestBuilder();

    expect(builder.create({ cursor: "next-page", ignored: "not forwarded" })).toEqual({
      ok: true,
      value: {
        jsonrpc: "2.0",
        id: 1,
        method: "resources/templates/list",
        params: { cursor: "next-page" },
      },
    });
  });

  it("rejects malformed or oversized cursors before consuming an ID", () => {
    const builder = new McpResourcesTemplatesListRequestBuilder();

    expect(builder.create({ cursor: "" })).toMatchObject({
      ok: false,
      error: { code: "NOVA-TL002" },
    });
    expect(builder.create({ cursor: "x".repeat(257) })).toMatchObject({
      ok: false,
      error: { code: "NOVA-TL002" },
    });
    expect(builder.create({ cursor: 4 })).toMatchObject({
      ok: false,
      error: { code: "NOVA-TL002" },
    });
    expect(builder.create({ cursor: "valid" })).toMatchObject({
      ok: true,
      value: { id: 1 },
    });
  });
});
