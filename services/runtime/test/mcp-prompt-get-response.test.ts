import { describe, expect, it } from "vitest";
import { McpPromptGetResponseValidator } from "../src/mcp-prompt-get-response.js";

describe("McpPromptGetResponseValidator", () => {
  it("normalizes a correlated prompt response into observed messages", () => {
    const validator = new McpPromptGetResponseValidator();

    expect(
      validator.parse(
        {
          jsonrpc: "2.0",
          id: 4,
          result: {
            resultType: "complete",
            description: "Observed code review prompt",
            messages: [
              {
                role: "user",
                content: {
                  type: "text",
                  text: "Please review this code.",
                },
              },
              {
                role: "assistant",
                content: {
                  type: "resource_link",
                  uri: "file:///project/README.md",
                  name: "README.md",
                  mimeType: "text/markdown",
                },
              },
            ],
          },
        },
        4,
      ),
    ).toEqual({
      ok: true,
      value: {
        description: "Observed code review prompt",
        messages: [
          {
            role: "user",
            content: {
              kind: "text",
              observed: true,
              text: "Please review this code.",
            },
          },
          {
            role: "assistant",
            content: {
              kind: "resource_link",
              observed: true,
              uri: "file:///project/README.md",
              name: "README.md",
              mime_type: "text/markdown",
            },
          },
        ],
      },
    });
  });

  it("filters malformed messages while retaining valid observed siblings", () => {
    const validator = new McpPromptGetResponseValidator();
    const result = validator.parse(
      {
        jsonrpc: "2.0",
        id: "prompt-1",
        result: {
          messages: [
            { role: "user", content: { type: "text", text: "Observed" } },
            { role: "system", content: { type: "text", text: "invalid role" } },
            { role: "user", content: { type: "text", text: "" } },
            {
              role: "assistant",
              content: {
                type: "image",
                data: "not-base64",
                mimeType: "image/png",
              },
            },
            {
              role: "assistant",
              content: {
                type: "resource",
                resource: {
                  uri: "file:///project/../secret.txt",
                  text: "unsafe",
                },
              },
            },
          ],
        },
      },
      "prompt-1",
    );

    expect(result).toEqual({
      ok: true,
      value: {
        messages: [
          {
            role: "user",
            content: { kind: "text", observed: true, text: "Observed" },
          },
        ],
      },
    });
  });

  it("rejects correlation, protocol, empty-validity, and oversized response failures", () => {
    const validator = new McpPromptGetResponseValidator();

    expect(validator.parse({ jsonrpc: "2.0", id: 1, result: { messages: [] } }, 2)).toMatchObject({
      ok: false,
      error: { code: "NOVA-TL002" },
    });
    expect(
      validator.parse({ jsonrpc: "2.0", id: 1, error: { code: -32603, message: "failed" } }, 1),
    ).toMatchObject({ ok: false, error: { code: "NOVA-TL002" } });
    expect(
      validator.parse(
        {
          jsonrpc: "2.0",
          id: 1,
          result: { description: "x".repeat(2_049), messages: [] },
        },
        1,
      ),
    ).toMatchObject({ ok: false, error: { code: "NOVA-TL002" } });
    expect(
      validator.parse(
        {
          jsonrpc: "2.0",
          id: 1,
          result: { messages: [{ role: "user", content: { type: "text", text: "" } }] },
        },
        1,
      ),
    ).toMatchObject({ ok: false, error: { code: "NOVA-TL002" } });
  });
});
