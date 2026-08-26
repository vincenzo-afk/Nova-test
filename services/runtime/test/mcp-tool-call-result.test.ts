import { describe, expect, it } from "vitest";
import { McpToolCallResultValidator } from "../src/mcp-tool-call-result.js";

describe("McpToolCallResultValidator", () => {
  it("normalizes a successful result into the canonical structured shape", () => {
    const validator = new McpToolCallResultValidator();

    const result = validator.parse(
      {
        jsonrpc: "2.0",
        id: 12,
        result: {
          content: [{ type: "text", text: "The weather is clear." }],
          structuredContent: { temperature: 21 },
          isError: false,
        },
      },
      12,
      "weather-server.get_weather",
      "invoke",
    );

    expect(result).toEqual({
      ok: true,
      value: {
        tool_id: "weather-server.get_weather",
        action_id: "invoke",
        status: "success",
        evidence: {
          type: "api_response",
          value: {
            observed_content: [{ kind: "text", text: "The weather is clear.", observed: true }],
            structured_content: { temperature: 21 },
            is_error: false,
          },
        },
        affected_resources: [],
      },
    });
  });

  it("rejects an oversized JSON response before result normalization", () => {
    const validator = new McpToolCallResultValidator();
    const result = validator.parse(
      {
        jsonrpc: "2.0",
        id: 1,
        result: {
          content: [{ type: "text", text: "Observed" }],
          ignored: "x".repeat(33_554_433),
        },
      },
      1,
      "weather-server.get_weather",
      "invoke",
    );

    expect(result).toMatchObject({
      ok: false,
      error: { code: "NOVA-TL002" },
    });
  });

  it("keeps server-reported tool failures distinct from malformed protocol responses", () => {
    const validator = new McpToolCallResultValidator();

    const executionFailure = validator.parse(
      {
        jsonrpc: "2.0",
        id: 13,
        result: {
          content: [{ type: "text", text: "The upstream service is unavailable." }],
          isError: true,
        },
      },
      13,
      "weather-server.get_weather",
      "invoke",
    );
    expect(executionFailure).toMatchObject({
      ok: true,
      value: {
        status: "failure",
        error: { category: "external", message: "MCP tool execution reported an error." },
      },
    });

    const protocolFailure = validator.parse(
      {
        jsonrpc: "2.0",
        id: 13,
        error: { code: -32602, message: "Invalid params" },
      },
      13,
      "weather-server.get_weather",
      "invoke",
    );
    expect(protocolFailure).toMatchObject({
      ok: false,
      error: { code: "NOVA-TL002" },
    });
  });

  it("filters malformed content blocks while bounding observed text and structured data", () => {
    const validator = new McpToolCallResultValidator();
    const result = validator.parse(
      {
        jsonrpc: "2.0",
        id: 14,
        result: {
          content: [
            { type: "text", text: "safe observed content" },
            { type: "text", text: "" },
            { type: "unknown", value: "ignored" },
            { type: "resource_link", uri: "file:///tmp/../secret" },
            { type: "resource", resource: { uri: "https://user:pass@example.test/private" } },
          ],
          structuredContent: { answer: "observed" },
        },
      },
      14,
      "server.tool",
      "invoke",
    );

    expect(result).toMatchObject({
      ok: true,
      value: {
        evidence: {
          value: {
            observed_content: [{ kind: "text", text: "safe observed content", observed: true }],
            structured_content: { answer: "observed" },
          },
        },
      },
    });
  });
});
