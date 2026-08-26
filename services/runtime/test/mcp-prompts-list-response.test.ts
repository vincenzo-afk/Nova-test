import { describe, expect, it } from "vitest";
import { McpPromptsListResponseValidator } from "../src/mcp-prompts-list-response.js";

describe("McpPromptsListResponseValidator", () => {
  it("normalizes a correlated prompts/list response", () => {
    const validator = new McpPromptsListResponseValidator();

    expect(
      validator.parse(
        {
          jsonrpc: "2.0",
          id: 6,
          result: {
            prompts: [
              {
                name: "summarize_document",
                title: "Summarize document",
                description: "Create a concise summary.",
                arguments: [
                  {
                    name: "uri",
                    title: "Document URI",
                    description: "The document to summarize.",
                    required: true,
                  },
                ],
              },
            ],
            nextCursor: "next",
            ttlMs: 60_000,
            cacheScope: "public",
          },
        },
        6,
      ),
    ).toEqual({
      ok: true,
      value: {
        prompts: [
          {
            name: "summarize_document",
            title: "Summarize document",
            description: "Create a concise summary.",
            arguments: [
              {
                name: "uri",
                title: "Document URI",
                description: "The document to summarize.",
                required: true,
              },
            ],
          },
        ],
        next_cursor: "next",
        ttl_ms: 60_000,
        cache_scope: "public",
        rejected_prompt_names: [],
      },
    });
  });

  it("rejects an oversized JSON response before prompt normalization", () => {
    const validator = new McpPromptsListResponseValidator();
    const result = validator.parse(
      {
        jsonrpc: "2.0",
        id: 1,
        result: {
          prompts: [{ name: "valid_prompt" }],
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

  it("filters malformed and duplicate prompts without exposing prompt content", () => {
    const validator = new McpPromptsListResponseValidator();
    const result = validator.parse(
      {
        jsonrpc: "2.0",
        id: "prompts-1",
        result: {
          prompts: [
            { name: "help", description: "Observed metadata" },
            { name: "help", description: "duplicate" },
            { name: "bad prompt", description: "invalid name" },
            { name: "bad-argument", arguments: [{ name: "x", required: "yes" }] },
          ],
        },
      },
      "prompts-1",
    );

    expect(result).toEqual({
      ok: true,
      value: {
        prompts: [{ name: "help", description: "Observed metadata" }],
        rejected_prompt_names: ["help", "bad prompt", "bad-argument"],
      },
    });
    expect(JSON.stringify(result)).not.toContain("content");
  });

  it("rejects correlation errors, response-level errors, and invalid pagination metadata", () => {
    const validator = new McpPromptsListResponseValidator();

    expect(validator.parse({ jsonrpc: "2.0", id: 1, result: { prompts: [] } }, 2)).toMatchObject({
      ok: false,
      error: { code: "NOVA-TL002" },
    });
    expect(
      validator.parse({ jsonrpc: "2.0", id: 1, error: { code: -32603, message: "failed" } }, 1),
    ).toMatchObject({ ok: false, error: { code: "NOVA-TL002" } });
    expect(
      validator.parse({ jsonrpc: "2.0", id: 1, result: { prompts: [], ttlMs: 0 } }, 1),
    ).toMatchObject({ ok: false, error: { code: "NOVA-TL002" } });
  });
});
