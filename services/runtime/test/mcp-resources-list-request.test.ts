import { describe, expect, it } from "vitest";
import { McpResourcesListRequestBuilder } from "../src/mcp-resources-list-request.js";

describe("McpResourcesListRequestBuilder", () => {
  it("builds a fixed resources/list request without optional parameters", () => {
    const builder = new McpResourcesListRequestBuilder();

    expect(builder.create()).toEqual({
      ok: true,
      value: {
        jsonrpc: "2.0",
        id: 1,
        method: "resources/list",
        params: {},
      },
    });
  });

  it("includes a bounded opaque cursor and forwards no unknown fields", () => {
    const builder = new McpResourcesListRequestBuilder();

    expect(builder.create({ cursor: "next-page", ignored: "not forwarded" })).toEqual({
      ok: true,
      value: {
        jsonrpc: "2.0",
        id: 1,
        method: "resources/list",
        params: { cursor: "next-page" },
      },
    });
  });

  it("rejects malformed or oversized cursors before consuming an ID", () => {
    const builder = new McpResourcesListRequestBuilder();

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
