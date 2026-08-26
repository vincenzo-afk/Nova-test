import { describe, expect, it } from "vitest";
import { McpPromptsListRequestBuilder } from "../src/mcp-prompts-list-request.js";

describe("McpPromptsListRequestBuilder", () => {
  it("builds a fixed prompts/list request without optional parameters", () => {
    const builder = new McpPromptsListRequestBuilder();

    expect(builder.create()).toEqual({
      ok: true,
      value: {
        jsonrpc: "2.0",
        id: 1,
        method: "prompts/list",
        params: {},
      },
    });
  });

  it("includes a bounded cursor and does not expose caller-owned option objects", () => {
    const builder = new McpPromptsListRequestBuilder();

    expect(builder.create({ cursor: "next-page", ignored: "not forwarded" })).toEqual({
      ok: true,
      value: {
        jsonrpc: "2.0",
        id: 1,
        method: "prompts/list",
        params: { cursor: "next-page" },
      },
    });
  });

  it("rejects malformed or oversized cursors before consuming an ID", () => {
    const builder = new McpPromptsListRequestBuilder();

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
