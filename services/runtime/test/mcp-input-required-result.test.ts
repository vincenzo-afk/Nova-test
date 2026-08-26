import { describe, expect, it } from "vitest";
import { McpInputRequiredResultValidator } from "../src/mcp-input-required-result.js";

describe("McpInputRequiredResultValidator", () => {
  it("normalizes a correlated input-required result with elicitation requests and opaque state", () => {
    const validator = new McpInputRequiredResultValidator();

    expect(
      validator.parse(
        {
          jsonrpc: "2.0",
          id: "call-1",
          result: {
            resultType: "input_required",
            inputRequests: {
              github_login: {
                method: "elicitation/create",
                params: {
                  mode: "form",
                  message: "Please provide your username.",
                  requestedSchema: { type: "object", properties: { name: { type: "string" } } },
                  secret: "not forwarded",
                },
              },
            },
            requestState: "opaque-state-token",
            ignored: "not forwarded",
          },
        },
        "call-1",
      ),
    ).toEqual({
      ok: true,
      value: {
        input_requests: {
          github_login: {
            method: "elicitation/create",
            mode: "form",
            message: "Please provide your username.",
            requested_schema: { type: "object", properties: { name: { type: "string" } } },
          },
        },
        request_state: "opaque-state-token",
      },
    });
  });

  it("accepts request state without input requests and clones the normalized request map", () => {
    const validator = new McpInputRequiredResultValidator();
    const request = {
      method: "elicitation/create",
      params: { mode: "url", message: "Continue securely.", url: "https://example.test/continue" },
    };
    const response = {
      jsonrpc: "2.0",
      id: 4,
      result: { resultType: "input_required", inputRequests: { consent: request } },
    };

    const parsed = validator.parse(response, 4);
    request.params.url = "https://changed.example.test";

    expect(parsed).toEqual({
      ok: true,
      value: {
        input_requests: {
          consent: {
            method: "elicitation/create",
            mode: "url",
            message: "Continue securely.",
            url: "https://example.test/continue",
          },
        },
      },
    });
  });

  it("rejects malformed correlation, missing input, unsupported requests, and oversized state", () => {
    const validator = new McpInputRequiredResultValidator();
    const base = {
      jsonrpc: "2.0",
      id: 1,
      result: { resultType: "input_required", requestState: "state" },
    };

    expect(validator.parse(base, 2)).toMatchObject({
      ok: false,
      error: { code: "NOVA-TL002" },
    });
    expect(
      validator.parse({ jsonrpc: "2.0", id: 1, result: { resultType: "input_required" } }, 1),
    ).toMatchObject({ ok: false, error: { code: "NOVA-TL002" } });
    expect(
      validator.parse(
        {
          ...base,
          result: {
            resultType: "input_required",
            inputRequests: {
              sample: { method: "sampling/createMessage", params: {} },
            },
          },
        },
        1,
      ),
    ).toMatchObject({ ok: false, error: { code: "NOVA-TL002" } });
    expect(
      validator.parse({ ...base, result: { ...base.result, requestState: "x".repeat(8_193) } }, 1),
    ).toMatchObject({ ok: false, error: { code: "NOVA-TL002" } });
  });
});
