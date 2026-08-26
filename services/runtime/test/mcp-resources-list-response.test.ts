import { describe, expect, it } from "vitest";
import { McpResourcesListResponseValidator } from "../src/mcp-resources-list-response.js";

describe("McpResourcesListResponseValidator", () => {
  it("normalizes a correlated resources/list response", () => {
    const validator = new McpResourcesListResponseValidator();

    expect(
      validator.parse(
        {
          jsonrpc: "2.0",
          id: 4,
          result: {
            resultType: "complete",
            resources: [
              {
                uri: "file:///project/README.md",
                name: "README.md",
                title: "Project README",
                description: "Project documentation",
                mimeType: "text/markdown",
                size: 512,
              },
            ],
            nextCursor: "next-page",
            ttlMs: 60_000,
            cacheScope: "private",
          },
        },
        4,
      ),
    ).toEqual({
      ok: true,
      value: {
        resources: [
          {
            uri: "file:///project/README.md",
            name: "README.md",
            title: "Project README",
            description: "Project documentation",
            mime_type: "text/markdown",
            size_bytes: 512,
          },
        ],
        next_cursor: "next-page",
        ttl_ms: 60_000,
        cache_scope: "private",
        rejected_resource_uris: [],
      },
    });
  });

  it("rejects an oversized JSON response before resource normalization", () => {
    const validator = new McpResourcesListResponseValidator();
    const result = validator.parse(
      {
        jsonrpc: "2.0",
        id: 1,
        result: {
          resources: [{ uri: "file:///project/README.md", name: "README.md" }],
          ignored: "x".repeat(1_048_577),
        },
      },
      1,
    );

    expect(result).toMatchObject({
      ok: false,
      error: { code: "NOVA-TL002" },
    });
  });

  it("filters malformed or duplicate resources while retaining valid records", () => {
    const validator = new McpResourcesListResponseValidator();

    const result = validator.parse(
      {
        jsonrpc: "2.0",
        id: "resources-1",
        result: {
          resources: [
            { uri: "file:///project/one.md", name: "one" },
            { uri: "file:///project/one.md", name: "duplicate" },
            { uri: "not a uri", name: "unsafe" },
            { uri: "file:///project/../secret", name: "traversal" },
          ],
        },
      },
      "resources-1",
    );

    expect(result).toEqual({
      ok: true,
      value: {
        resources: [{ uri: "file:///project/one.md", name: "one" }],
        rejected_resource_uris: [
          "file:///project/one.md",
          "not a uri",
          "file:///project/../secret",
        ],
      },
    });
  });

  it("rejects correlation, response-level errors, and invalid pagination metadata", () => {
    const validator = new McpResourcesListResponseValidator();

    expect(validator.parse({ jsonrpc: "2.0", id: 2, result: { resources: [] } }, 3)).toMatchObject({
      ok: false,
      error: { code: "NOVA-TL002" },
    });
    expect(
      validator.parse({ jsonrpc: "2.0", id: 2, error: { code: -32603, message: "failed" } }, 2),
    ).toMatchObject({ ok: false, error: { code: "NOVA-TL002" } });
    expect(
      validator.parse({ jsonrpc: "2.0", id: 2, result: { resources: [], ttlMs: 0 } }, 2),
    ).toMatchObject({ ok: false, error: { code: "NOVA-TL002" } });
  });
});
