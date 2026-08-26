import { describe, expect, it } from "vitest";
import { McpResourcesTemplatesListResponseValidator } from "../src/mcp-resources-templates-list-response.js";

describe("McpResourcesTemplatesListResponseValidator", () => {
  it("normalizes a correlated paginated resource-template response", () => {
    const validator = new McpResourcesTemplatesListResponseValidator();

    expect(
      validator.parse(
        {
          jsonrpc: "2.0",
          id: 8,
          result: {
            resultType: "complete",
            resourceTemplates: [
              {
                uriTemplate: "file:///project/{path}",
                name: "project_files",
                title: "Project files",
                description: "Access project files by path.",
                mimeType: "application/octet-stream",
              },
            ],
            nextCursor: "next-page",
            ttlMs: 300_000,
            cacheScope: "public",
          },
        },
        8,
      ),
    ).toEqual({
      ok: true,
      value: {
        resource_templates: [
          {
            uri_template: "file:///project/{path}",
            name: "project_files",
            title: "Project files",
            description: "Access project files by path.",
            mime_type: "application/octet-stream",
          },
        ],
        next_cursor: "next-page",
        ttl_ms: 300_000,
        cache_scope: "public",
        rejected_template_names: [],
      },
    });
  });

  it("rejects an oversized JSON response before template normalization", () => {
    const validator = new McpResourcesTemplatesListResponseValidator();
    const result = validator.parse(
      {
        jsonrpc: "2.0",
        id: 1,
        result: {
          resourceTemplates: [{ uriTemplate: "file:///project/{path}", name: "files" }],
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

  it("filters unsafe, malformed, and duplicate templates while retaining valid siblings", () => {
    const validator = new McpResourcesTemplatesListResponseValidator();
    const result = validator.parse(
      {
        jsonrpc: "2.0",
        id: "templates-1",
        result: {
          resourceTemplates: [
            { uriTemplate: "file:///project/{path}", name: "files" },
            { uriTemplate: "file:///project/{path}", name: "files" },
            { uriTemplate: "file:///project/../{path}", name: "traversal" },
            { uriTemplate: "https://user:password@example.test/{id}", name: "credentials" },
            { uriTemplate: "not a URI template", name: "invalid" },
            { uriTemplate: "file:///project/{path}", name: "bad mime", mimeType: 4 },
          ],
        },
      },
      "templates-1",
    );

    expect(result).toEqual({
      ok: true,
      value: {
        resource_templates: [{ uri_template: "file:///project/{path}", name: "files" }],
        rejected_template_names: ["files", "traversal", "credentials", "invalid", "bad mime"],
      },
    });
  });

  it("fails closed for correlation, response, pagination, and empty-validity errors", () => {
    const validator = new McpResourcesTemplatesListResponseValidator();

    expect(
      validator.parse({ jsonrpc: "2.0", id: 1, result: { resourceTemplates: [] } }, 2),
    ).toMatchObject({ ok: false, error: { code: "NOVA-TL002" } });
    expect(
      validator.parse({ jsonrpc: "2.0", id: 1, error: { code: -32603, message: "failed" } }, 1),
    ).toMatchObject({ ok: false, error: { code: "NOVA-TL002" } });
    expect(
      validator.parse({ jsonrpc: "2.0", id: 1, result: { resourceTemplates: [], ttlMs: 0 } }, 1),
    ).toMatchObject({ ok: false, error: { code: "NOVA-TL002" } });
    expect(
      validator.parse(
        {
          jsonrpc: "2.0",
          id: 1,
          result: { resourceTemplates: [{ uriTemplate: "file:///project/{path}" }] },
        },
        1,
      ),
    ).toMatchObject({ ok: false, error: { code: "NOVA-TL002" } });
  });
});
