import { describe, expect, it } from "vitest";
import { McpElicitationRequestValidator } from "../src/mcp-elicitation-request.js";

describe("McpElicitationRequestValidator", () => {
  it("normalizes a form-mode request and preserves only bounded observed fields", () => {
    const validator = new McpElicitationRequestValidator();

    expect(
      validator.parse({
        method: "elicitation/create",
        params: {
          mode: "form",
          message: "Please provide your display name.",
          requestedSchema: {
            type: "object",
            properties: { name: { type: "string" } },
            required: ["name"],
          },
          secret: "not forwarded",
        },
      }),
    ).toEqual({
      ok: true,
      value: {
        method: "elicitation/create",
        mode: "form",
        message: "Please provide your display name.",
        requested_schema: {
          type: "object",
          properties: { name: { type: "string" } },
          required: ["name"],
        },
      },
    });
  });

  it("defaults omitted mode to form and validates a safe HTTPS URL mode request", () => {
    const validator = new McpElicitationRequestValidator();

    expect(
      validator.parse({
        method: "elicitation/create",
        params: {
          message: "Continue in the secure account page.",
          requestedSchema: { type: "object", properties: {} },
        },
      }),
    ).toMatchObject({ ok: true, value: { mode: "form" } });
    expect(
      validator.parse({
        method: "elicitation/create",
        params: {
          mode: "url",
          message: "Open the account page to continue.",
          url: "https://example.test/connect?state=abc",
        },
      }),
    ).toEqual({
      ok: true,
      value: {
        method: "elicitation/create",
        mode: "url",
        message: "Open the account page to continue.",
        url: "https://example.test/connect?state=abc",
      },
    });
  });

  it("deep-clones schemas and rejects malformed modes, schemas, URLs, and oversized messages", () => {
    const validator = new McpElicitationRequestValidator();
    const requestedSchema = { type: "object", properties: { name: { type: "string" } } };
    const request = {
      method: "elicitation/create",
      params: { mode: "form", message: "Name", requestedSchema },
    };
    const parsed = validator.parse(request);
    requestedSchema.properties.name = { type: "number" };

    expect(parsed).toEqual({
      ok: true,
      value: {
        method: "elicitation/create",
        mode: "form",
        message: "Name",
        requested_schema: { type: "object", properties: { name: { type: "string" } } },
      },
    });
    expect(validator.parse({ method: "other/method", params: { message: "Name" } })).toMatchObject({
      ok: false,
      error: { code: "NOVA-TL002" },
    });
    expect(
      validator.parse({ method: "elicitation/create", params: { mode: "other", message: "Name" } }),
    ).toMatchObject({ ok: false, error: { code: "NOVA-TL002" } });
    expect(
      validator.parse({
        method: "elicitation/create",
        params: { mode: "form", message: "Name", requestedSchema: { type: "string" } },
      }),
    ).toMatchObject({ ok: false, error: { code: "NOVA-TL002" } });
    expect(
      validator.parse({
        method: "elicitation/create",
        params: { mode: "url", message: "Open", url: "http://example.test/connect" },
      }),
    ).toMatchObject({ ok: false, error: { code: "NOVA-TL002" } });
    expect(
      validator.parse({
        method: "elicitation/create",
        params: { mode: "url", message: "Open", url: "https://user:secret@example.test" },
      }),
    ).toMatchObject({ ok: false, error: { code: "NOVA-TL002" } });
    expect(
      validator.parse({
        method: "elicitation/create",
        params: { mode: "form", message: "x".repeat(2_049), requestedSchema: {} },
      }),
    ).toMatchObject({ ok: false, error: { code: "NOVA-TL002" } });
  });
});
