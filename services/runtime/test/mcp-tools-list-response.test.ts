import { describe, expect, it } from "vitest";
import { McpToolsListResponseValidator } from "../src/mcp-tools-list-response.js";

describe("McpToolsListResponseValidator", () => {
  it("accepts a correlated tools/list result and preserves bounded schemas", () => {
    const validator = new McpToolsListResponseValidator();

    const result = validator.parse(
      {
        jsonrpc: "2.0",
        id: 7,
        result: {
          tools: [
            {
              name: "get_weather",
              title: "Weather",
              description: "Read current weather.",
              inputSchema: {
                type: "object",
                properties: { city: { type: "string" } },
                required: ["city"],
              },
              outputSchema: {
                type: "object",
                properties: { temperature: { type: "number" } },
              },
              icons: [{ src: "https://example.test/weather.png" }],
            },
          ],
          nextCursor: "cursor-2",
          ttlMs: 300_000,
          cacheScope: "public",
        },
      },
      7,
    );

    expect(result).toEqual({
      ok: true,
      value: {
        tools: [
          {
            name: "get_weather",
            description: "Read current weather.",
            inputSchema: {
              type: "object",
              properties: { city: { type: "string" } },
              required: ["city"],
            },
            outputSchema: {
              type: "object",
              properties: { temperature: { type: "number" } },
            },
          },
        ],
        next_cursor: "cursor-2",
        ttl_ms: 300_000,
        cache_scope: "public",
        rejected_tool_names: [],
      },
    });
  });

  it("rejects a mismatched JSON-RPC response id and protocol error response", () => {
    const validator = new McpToolsListResponseValidator();

    expect(
      validator.parse({ jsonrpc: "2.0", id: "wrong", result: { tools: [] } }, "expected"),
    ).toMatchObject({ ok: false, error: { code: "NOVA-TL002" } });
    expect(
      validator.parse(
        {
          jsonrpc: "2.0",
          id: 1,
          error: { code: -32602, message: "Invalid request" },
        },
        1,
      ),
    ).toMatchObject({ ok: false, error: { code: "NOVA-TL002" } });
  });

  it("rejects an oversized JSON schema before response normalization", () => {
    const validator = new McpToolsListResponseValidator();
    const result = validator.parse(
      {
        jsonrpc: "2.0",
        id: 1,
        result: {
          tools: [
            {
              name: "large_schema",
              inputSchema: { type: "object", description: "x".repeat(131_073) },
            },
          ],
        },
      },
      1,
    );

    expect(result).toMatchObject({
      ok: true,
      value: { tools: [], rejected_tool_names: ["large_schema"] },
    });
  });

  it("filters malformed tools while retaining valid tools and bounded rejection names", () => {
    const validator = new McpToolsListResponseValidator();

    const result = validator.parse(
      {
        jsonrpc: "2.0",
        id: 1,
        result: {
          tools: [
            { name: "valid_tool", inputSchema: { type: "object" } },
            { name: "bad tool", inputSchema: { type: "object" } },
            { name: "null_schema", inputSchema: null },
            { name: "wrong_shape", inputSchema: { type: "not-json-schema" } },
          ],
        },
      },
      1,
    );

    expect(result).toMatchObject({
      ok: true,
      value: {
        tools: [{ name: "valid_tool", inputSchema: { type: "object" } }],
        rejected_tool_names: ["bad tool", "null_schema", "wrong_shape"],
      },
    });
  });
});
