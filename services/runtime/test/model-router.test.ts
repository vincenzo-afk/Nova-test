import { describe, expect, it, vi } from "vitest";
import { ModelRouter } from "../src/model-router.js";
import type { LlmProvider } from "../src/model-router.js";

const descriptor = (
  overrides: Partial<LlmProvider["descriptor"]> = {},
): LlmProvider["descriptor"] => ({
  provider_id: "local-test",
  domain: "llm",
  privacy_class: "local",
  schema_version: "1.0.0",
  cost_per_1k_tokens: 0,
  capabilities: {
    tool_calls: true,
    vision_input: false,
    streaming: false,
    max_context_tokens: 8_192,
  },
  ...overrides,
});

const provider = (overrides: Partial<LlmProvider> = {}): LlmProvider => {
  const providerDescriptor = overrides.descriptor ?? descriptor();
  return {
    descriptor: providerDescriptor,
    healthCheck: vi.fn(async () => "reachable"),
    invoke: vi.fn(async () => ({ text: "hello", provider_id: providerDescriptor.provider_id })),
    ...overrides,
  };
};

describe("ModelRouter", () => {
  it("selects a local provider when privacy requires local-only routing", async () => {
    const local = provider({ descriptor: descriptor({ provider_id: "local" }) });
    const cloud = provider({
      descriptor: descriptor({
        provider_id: "cloud",
        privacy_class: "cloud",
        cost_per_1k_tokens: 0.01,
      }),
    });
    const router = new ModelRouter([cloud, local], { preference: ["cloud", "local"] });

    const result = await router.invoke({
      task_type: "planning",
      privacy: "local_only",
      required_capabilities: [],
    });

    expect(result).toMatchObject({ ok: true, value: { provider_id: "local" } });
    expect(cloud.invoke).not.toHaveBeenCalled();
  });

  it("filters providers that lack required capabilities before invocation", async () => {
    const noTools = provider({
      descriptor: descriptor({
        provider_id: "no-tools",
        capabilities: {
          tool_calls: false,
          vision_input: false,
          streaming: false,
          max_context_tokens: 8_192,
        },
      }),
    });
    const capable = provider({ descriptor: descriptor({ provider_id: "capable" }) });
    const router = new ModelRouter([noTools, capable]);

    const result = await router.invoke({
      task_type: "planning",
      privacy: "any",
      required_capabilities: ["tool_calls"],
    });

    expect(result).toMatchObject({ ok: true, value: { provider_id: "capable" } });
    expect(noTools.invoke).not.toHaveBeenCalled();
  });

  it("falls back deterministically when the preferred provider fails", async () => {
    const preferred = provider({
      descriptor: descriptor({ provider_id: "preferred", cost_per_1k_tokens: 0.01 }),
      invoke: vi.fn(async () => {
        throw new Error("network down");
      }),
    });
    const fallback = provider({
      descriptor: descriptor({ provider_id: "fallback", cost_per_1k_tokens: 0.02 }),
    });
    const router = new ModelRouter([preferred, fallback], {
      preference: ["preferred", "fallback"],
      retryAttempts: 1,
    });

    const result = await router.invoke({
      task_type: "planning",
      privacy: "any",
      required_capabilities: [],
    });

    expect(result).toMatchObject({ ok: true, value: { provider_id: "fallback", text: "hello" } });
  });

  it("returns a stable timeout error and does not hang", async () => {
    const slow = provider({
      invoke: vi.fn(() => new Promise(() => undefined)),
    });
    const router = new ModelRouter([slow], { requestTimeoutMs: 5 });

    const result = await router.invoke({
      task_type: "planning",
      privacy: "any",
      required_capabilities: [],
    });

    expect(result).toMatchObject({ ok: false, error: { code: "NOVA-AI002" } });
  });

  it("rejects a provider response that violates the LLM response schema", async () => {
    const invalid = provider({ invoke: vi.fn(async () => ({ provider_id: "local-test" })) });
    const router = new ModelRouter([invalid]);

    const result = await router.invoke({
      task_type: "planning",
      privacy: "any",
      required_capabilities: [],
    });

    expect(result).toMatchObject({ ok: false, error: { code: "NOVA-AI002" } });
  });

  it("opens the provider circuit after five consecutive failures", async () => {
    const failing = provider({
      invoke: vi.fn(async () => {
        throw new Error("failure");
      }),
    });
    const router = new ModelRouter([failing], { retryAttempts: 1, circuitFailureThreshold: 5 });

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await router.invoke({ task_type: "planning", privacy: "any", required_capabilities: [] });
    }
    const callsBeforeOpen = failing.invoke.mock.calls.length;
    await router.invoke({ task_type: "planning", privacy: "any", required_capabilities: [] });

    expect(failing.invoke.mock.calls.length).toBe(callsBeforeOpen);
    expect(router.health("local-test")).toBe("down");
  });
});
