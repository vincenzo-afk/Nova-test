import { describe, expect, it } from "vitest";
import { McpElicitationResponseValidator } from "../src/mcp-elicitation-response.js";

describe("McpElicitationResponseValidator", () => {
  it("normalizes an accepted response with cloned structured content", () => {
    const validator = new McpElicitationResponseValidator();
    const content = { name: "Ada", age: 36 };

    const result = validator.parse({ action: "accept", content });
    content.age = 37;

    expect(result).toEqual({
      ok: true,
      value: { action: "accept", content: { name: "Ada", age: 36 } },
    });
  });

  it("accepts decline and cancel responses without content", () => {
    const validator = new McpElicitationResponseValidator();

    expect(validator.parse({ action: "decline" })).toEqual({
      ok: true,
      value: { action: "decline" },
    });
    expect(validator.parse({ action: "cancel", ignored: "not forwarded" })).toEqual({
      ok: true,
      value: { action: "cancel" },
    });
  });

  it("rejects malformed actions, content, and oversized payloads", () => {
    const validator = new McpElicitationResponseValidator();

    expect(validator.parse({ action: "other" })).toMatchObject({
      ok: false,
      error: { code: "NOVA-TL002" },
    });
    expect(validator.parse({ action: "accept", content: "secret" })).toMatchObject({
      ok: false,
      error: { code: "NOVA-TL002" },
    });
    expect(validator.parse({ action: "accept", content: [] })).toMatchObject({
      ok: false,
      error: { code: "NOVA-TL002" },
    });
    expect(
      validator.parse({ action: "accept", content: { value: "x".repeat(65_537) } }),
    ).toMatchObject({ ok: false, error: { code: "NOVA-TL002" } });
    expect(validator.parse({ action: "decline", content: { reason: "not allowed" } })).toEqual({
      ok: true,
      value: { action: "decline", content: { reason: "not allowed" } },
    });
  });
});
