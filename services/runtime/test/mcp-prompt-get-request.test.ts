import { describe, expect, it } from "vitest";
import { McpPromptGetRequestBuilder } from "../src/mcp-prompt-get-request.js";

describe("McpPromptGetRequestBuilder", () => {
  it("builds a fixed prompts/get request with a safe prompt name", () => {
    const builder = new McpPromptGetRequestBuilder();

    expect(builder.create("code_review")).toEqual({
      ok: true,
      value: {
        jsonrpc: "2.0",
        id: 1,
        method: "prompts/get",
        params: { name: "code_review" },
      },
    });
  });

  it("clones bounded prompt arguments and optional input state without forwarding unknown fields", () => {
    const builder = new McpPromptGetRequestBuilder();
    const argumentsValue = { code: "const answer = 42;" };
    const inputResponses = { approval: "yes" };
    const result = builder.create("code_review", {
      arguments: argumentsValue,
      inputResponses,
      requestState: "state-1",
      ignored: "not forwarded",
    });
    argumentsValue.code = "mutated";
    inputResponses.approval = "mutated";

    expect(result).toEqual({
      ok: true,
      value: {
        jsonrpc: "2.0",
        id: 1,
        method: "prompts/get",
        params: {
          name: "code_review",
          arguments: { code: "const answer = 42;" },
          inputResponses: { approval: "yes" },
          requestState: "state-1",
        },
      },
    });
  });

  it("rejects unsafe or oversized values before consuming an ID", () => {
    const builder = new McpPromptGetRequestBuilder();

    expect(builder.create("bad prompt")).toMatchObject({
      ok: false,
      error: { code: "NOVA-TL002" },
    });
    expect(builder.create("../secret")).toMatchObject({
      ok: false,
      error: { code: "NOVA-TL002" },
    });
    expect(builder.create("valid", { arguments: { code: "x".repeat(140_000) } })).toMatchObject({
      ok: false,
      error: { code: "NOVA-TL002" },
    });
    expect(
      builder.create("valid", { inputResponses: { approval: { nested: true } } }),
    ).toMatchObject({ ok: false, error: { code: "NOVA-TL002" } });
    expect(builder.create("valid")).toMatchObject({
      ok: true,
      value: { id: 1 },
    });
  });
});
