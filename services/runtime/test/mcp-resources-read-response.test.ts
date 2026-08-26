import { describe, expect, it } from "vitest";
import { McpResourcesReadResponseValidator } from "../src/mcp-resources-read-response.js";

describe("McpResourcesReadResponseValidator", () => {
  it("normalizes correlated text and binary resource contents", () => {
    const validator = new McpResourcesReadResponseValidator();

    expect(
      validator.parse(
        {
          jsonrpc: "2.0",
          id: 5,
          result: {
            resultType: "complete",
            contents: [
              {
                uri: "file:///project/README.md",
                mimeType: "text/markdown",
                text: "# Read me",
              },
              {
                uri: "file:///project/icon.png",
                mimeType: "image/png",
                blob: "aGVsbG8=",
              },
            ],
            ttlMs: 60_000,
            cacheScope: "private",
          },
        },
        5,
      ),
    ).toEqual({
      ok: true,
      value: {
        contents: [
          {
            uri: "file:///project/README.md",
            mime_type: "text/markdown",
            text: "# Read me",
          },
          {
            uri: "file:///project/icon.png",
            mime_type: "image/png",
            blob_base64: "aGVsbG8=",
          },
        ],
        ttl_ms: 60_000,
        cache_scope: "private",
        rejected_content_uris: [],
      },
    });
  });

  it("rejects an oversized JSON response before resource normalization", () => {
    const validator = new McpResourcesReadResponseValidator();
    const result = validator.parse(
      {
        jsonrpc: "2.0",
        id: 1,
        result: {
          contents: [{ uri: "file:///project/README.md", text: "Observed" }],
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

  it("filters malformed contents while retaining valid observed data", () => {
    const validator = new McpResourcesReadResponseValidator();
    const result = validator.parse(
      {
        jsonrpc: "2.0",
        id: "read-1",
        result: {
          contents: [
            { uri: "file:///project/valid.txt", text: "valid" },
            { uri: "file:///project/both.txt", text: "text", blob: "aGVsbG8=" },
            { uri: "file:///project/bad.txt", blob: "not base64!" },
          ],
        },
      },
      "read-1",
    );

    expect(result).toEqual({
      ok: true,
      value: {
        contents: [{ uri: "file:///project/valid.txt", text: "valid" }],
        rejected_content_uris: ["file:///project/both.txt", "file:///project/bad.txt"],
      },
    });
  });

  it("rejects correlation errors, empty contents, and invalid pagination metadata", () => {
    const validator = new McpResourcesReadResponseValidator();

    expect(validator.parse({ jsonrpc: "2.0", id: 1, result: { contents: [] } }, 2)).toMatchObject({
      ok: false,
      error: { code: "NOVA-TL002" },
    });
    expect(validator.parse({ jsonrpc: "2.0", id: 1, result: { contents: [] } }, 1)).toMatchObject({
      ok: false,
      error: { code: "NOVA-TL002" },
    });
    expect(
      validator.parse({ jsonrpc: "2.0", id: 1, result: { contents: [], ttlMs: 0 } }, 1),
    ).toMatchObject({ ok: false, error: { code: "NOVA-TL002" } });
  });
});
