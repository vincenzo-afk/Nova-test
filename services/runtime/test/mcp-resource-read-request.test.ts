import { describe, expect, it } from "vitest";
import { McpResourceReadRequestBuilder } from "../src/mcp-resource-read-request.js";

describe("McpResourceReadRequestBuilder", () => {
  it("builds a fixed resources/read request with a safe URI", () => {
    const builder = new McpResourceReadRequestBuilder();

    expect(builder.create("file:///project/README.md")).toEqual({
      ok: true,
      value: {
        jsonrpc: "2.0",
        id: 1,
        method: "resources/read",
        params: { uri: "file:///project/README.md" },
      },
    });
  });

  it("clones bounded optional input responses and request state without adding unknown fields", () => {
    const builder = new McpResourceReadRequestBuilder();
    const inputResponses = { choice: "approved" };
    const requestState = "state-1";

    const result = builder.create("https://example.test/resource", {
      inputResponses,
      requestState,
      ignored: "not forwarded",
    });
    inputResponses.choice = "mutated";

    expect(result).toEqual({
      ok: true,
      value: {
        jsonrpc: "2.0",
        id: 1,
        method: "resources/read",
        params: {
          uri: "https://example.test/resource",
          inputResponses: { choice: "approved" },
          requestState,
        },
      },
    });
  });

  it("rejects unsafe or oversized values before consuming an ID", () => {
    const builder = new McpResourceReadRequestBuilder();

    expect(builder.create("file:///project/../secret.txt")).toMatchObject({
      ok: false,
      error: { code: "NOVA-TL002" },
    });
    expect(builder.create("https://user:password@example.test/resource")).toMatchObject({
      ok: false,
      error: { code: "NOVA-TL002" },
    });
    expect(builder.create("not a uri")).toMatchObject({
      ok: false,
      error: { code: "NOVA-TL002" },
    });
    expect(
      builder.create("file:///project/file.txt", {
        inputResponses: { choice: "x".repeat(140_000) },
      }),
    ).toMatchObject({ ok: false, error: { code: "NOVA-TL002" } });
    expect(builder.create("file:///project/next.txt")).toMatchObject({
      ok: true,
      value: { id: 1 },
    });
  });
});
