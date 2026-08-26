import { describe, expect, it } from "vitest";
import { McpToolCallRequestBuilder } from "../src/mcp-tool-call-request.js";

describe("McpToolCallRequestBuilder", () => {
  it("builds correlated tools/call requests with generated IDs", () => {
    const builder = new McpToolCallRequestBuilder();

    expect(builder.create("get_weather", { city: "Berlin" })).toEqual({
      ok: true,
      value: {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "get_weather",
          arguments: { city: "Berlin" },
        },
      },
    });
    expect(builder.create("get_weather", {})).toMatchObject({
      ok: true,
      value: { id: 2, method: "tools/call" },
    });
  });

  it("fails closed on a non-string tool name without throwing", () => {
    const builder = new McpToolCallRequestBuilder();
    const invalidToolName = {
      get length(): number {
        throw new Error("length should not be read from an untrusted tool name");
      },
    } as unknown as string;

    expect(() => builder.create(invalidToolName, {})).not.toThrow();
    expect(builder.create(invalidToolName, {})).toMatchObject({
      ok: false,
      error: { code: "NOVA-TL002" },
    });
    expect(builder.create("valid", {})).toMatchObject({
      ok: true,
      value: { id: 1 },
    });
  });

  it("rejects invalid tool names and non-object arguments", () => {
    const builder = new McpToolCallRequestBuilder();

    expect(builder.create("bad tool", {})).toMatchObject({
      ok: false,
      error: { code: "NOVA-TL002" },
    });
    expect(builder.create("valid", [] as unknown as Record<string, unknown>)).toMatchObject({
      ok: false,
      error: { code: "NOVA-TL002" },
    });
    expect(builder.create("valid", null as unknown as Record<string, unknown>)).toMatchObject({
      ok: false,
      error: { code: "NOVA-TL002" },
    });
  });

  it("builds MRTR retry inputs with cloned elicitation responses and opaque request state", () => {
    const builder = new McpToolCallRequestBuilder();
    const inputResponses = { consent: { action: "accept", content: { name: "Ada" } } };

    const result = builder.create(
      "continue_setup",
      { step: 2 },
      { inputResponses, requestState: "opaque-state" },
    );
    inputResponses.consent.content.name = "Changed";

    expect(result).toEqual({
      ok: true,
      value: {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "continue_setup",
          arguments: { step: 2 },
          inputResponses: { consent: { action: "accept", content: { name: "Ada" } } },
          requestState: "opaque-state",
        },
      },
    });
  });

  it("rejects malformed MRTR retry inputs without advancing the request ID", () => {
    const builder = new McpToolCallRequestBuilder();

    expect(
      builder.create("valid", {}, { inputResponses: { consent: { action: "unknown" } } }),
    ).toMatchObject({ ok: false, error: { code: "NOVA-TL002" } });
    expect(builder.create("valid", {}, { requestState: "" })).toMatchObject({
      ok: false,
      error: { code: "NOVA-TL002" },
    });
    expect(builder.create("valid", {}, { ignored: "not forwarded" })).toMatchObject({
      ok: true,
      value: { id: 1 },
    });
  });

  it("rejects circular or oversized arguments without advancing the request ID", () => {
    const builder = new McpToolCallRequestBuilder();
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    expect(builder.create("valid", circular)).toMatchObject({
      ok: false,
      error: { code: "NOVA-TL002" },
    });
    expect(builder.create("valid", { payload: "x".repeat(131_073) })).toMatchObject({
      ok: false,
      error: { code: "NOVA-TL002" },
    });
    expect(builder.create("valid", { ok: true })).toMatchObject({
      ok: true,
      value: { id: 1 },
    });
  });
});
