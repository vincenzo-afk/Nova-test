import { describe, expect, it } from "vitest";
import { McpToolCallTimeout } from "../src/mcp-tool-call-timeout.js";

describe("McpToolCallTimeout", () => {
  it("returns a successful result and clears the timeout when the operation completes", async () => {
    const timeout = new McpToolCallTimeout();
    const result = await timeout.run(async () => "done", 100);

    expect(result).toEqual({ ok: true, value: "done" });
  });

  it("aborts a stalled operation and returns a retryable timeout result", async () => {
    const timeout = new McpToolCallTimeout();
    let aborted = false;
    const result = await timeout.run(
      (signal) =>
        new Promise<never>((_resolve, reject) => {
          signal.addEventListener("abort", () => {
            aborted = true;
            reject(new Error("aborted"));
          });
        }),
      5,
    );

    expect(aborted).toBe(true);
    expect(result).toMatchObject({
      ok: false,
      error: {
        code: "NOVA-TL001",
        retryable: true,
        details: { timeout_ms: 5 },
      },
    });
  });

  it("rejects invalid timeout budgets before starting the operation", async () => {
    const timeout = new McpToolCallTimeout();
    let started = false;
    const operation = async () => {
      started = true;
      return "should-not-run";
    };

    expect(await timeout.run(operation, 0)).toMatchObject({
      ok: false,
      error: { code: "NOVA-CFG001" },
    });
    expect(started).toBe(false);
  });
});
