import { describe, expect, it, vi } from "vitest";
import { MemoryLogSink, StructuredLogger } from "@nova/shared";
import {
  CapabilityRegistry,
  ProviderRouter,
  type Provider,
  type ProviderDescriptor,
} from "../src/provider-registry.js";

const descriptor = (overrides: Partial<ProviderDescriptor> = {}): ProviderDescriptor => ({
  provider_id: "local.test",
  domain: "llm",
  privacy_class: "local",
  schema_version: "1.0.0",
  capabilities: ["text_generation"],
  cost_per_request: 0,
  latency_p50_ms: 20,
  ...overrides,
});

const provider = (
  overrides: Partial<ProviderDescriptor> = {},
  health: "reachable" | "degraded" | "down" = "reachable",
): Provider => ({
  descriptor: descriptor(overrides),
  healthCheck: vi.fn(async () => health),
  invoke: vi.fn(async (request) => ({ provider_id: descriptor(overrides).provider_id, request })),
  cancel: vi.fn(),
  shutdown: vi.fn(),
});

describe("CapabilityRegistry and ProviderRouter", () => {
  it("registers providers, rejects duplicates, and exposes active capability state", () => {
    const registry = new CapabilityRegistry();
    const local = provider();

    expect(registry.register("text-generation", local)).toMatchObject({
      ok: true,
      value: { state: "Active" },
    });
    expect(registry.register("text-generation", local)).toMatchObject({
      ok: false,
      error: { code: "NOVA-AI002" },
    });
    expect(registry.get("text-generation")).toMatchObject({
      ok: true,
      value: { providers: [{ provider_id: "local.test", enabled: true }] },
    });
  });

  it("supports explicit provider disable and removal lifecycle", () => {
    const registry = new CapabilityRegistry();
    const local = provider();
    registry.register("text-generation", local);

    expect(registry.setEnabled("text-generation", "local.test", false)).toMatchObject({
      ok: true,
      value: { state: "Configured, disabled" },
    });
    expect(local.shutdown).not.toHaveBeenCalled();
    expect(registry.remove("local.test")).toMatchObject({ ok: true });
    expect(local.shutdown).toHaveBeenCalledOnce();
  });

  it("marks a capability degraded and routes around an unhealthy provider", async () => {
    const sink = new MemoryLogSink();
    const registry = new CapabilityRegistry(
      new StructuredLogger({ service: "runtime.providers", sink }),
    );
    const unhealthy = provider({ provider_id: "cloud.test", privacy_class: "cloud" }, "degraded");
    const local = provider({ provider_id: "local.test", privacy_class: "local" }, "reachable");
    registry.register("text-generation", unhealthy);
    registry.register("text-generation", local);
    const router = new ProviderRouter(registry);

    const selected = await router.select("text-generation", {});

    expect(selected).toMatchObject({
      ok: true,
      value: { descriptor: { provider_id: "local.test" } },
    });
    expect(registry.get("text-generation")).toMatchObject({ value: { state: "Degraded" } });
    expect(sink.records().map((record) => record.event)).toContain("provider.health.demoted");
    expect(
      sink.records().find((record) => record.event === "provider.health.demoted")?.details,
    ).toMatchObject({
      capability_id: "text-generation",
      provider_id: "cloud.test",
      health: "degraded",
    });
  });

  it("edits provider priority immediately and preserves the ordered registry snapshot", () => {
    const sink = new MemoryLogSink();
    const registry = new CapabilityRegistry(
      new StructuredLogger({ service: "runtime.providers", sink }),
    );
    registry.register("text-generation", provider({ provider_id: "first" }));
    registry.register("text-generation", provider({ provider_id: "second" }));

    const updated = registry.setPriority("text-generation", "second", 0);

    expect(updated).toMatchObject({
      ok: true,
      value: {
        providers: [
          { provider_id: "second", priority: 0 },
          { provider_id: "first", priority: 1 },
        ],
      },
    });
    expect(sink.records().map((record) => record.event)).toContain("provider.priority.updated");
  });

  it("rejects invalid priority edits without mutating provider state", () => {
    const registry = new CapabilityRegistry();
    registry.register("text-generation", provider({ provider_id: "local.test" }));

    expect(registry.setPriority("text-generation", "local.test", -1)).toMatchObject({
      ok: false,
      error: { code: "NOVA-AI002" },
    });
    expect(registry.get("text-generation")).toMatchObject({
      value: { providers: [{ provider_id: "local.test", priority: 1 }] },
    });
  });

  it("uses privacy-first local routing and filters lower schema versions", async () => {
    const registry = new CapabilityRegistry();
    registry.register(
      "text-generation",
      provider({ provider_id: "cloud.test", privacy_class: "cloud", schema_version: "2.0.0" }),
    );
    registry.register(
      "text-generation",
      provider({ provider_id: "local.test", privacy_class: "local", schema_version: "1.0.0" }),
    );
    registry.setPolicy("text-generation", { policy: "privacy-first" });
    const router = new ProviderRouter(registry);

    const selected = await router.select("text-generation", { required_schema_version: "1.0.0" });
    expect(selected).toMatchObject({
      ok: true,
      value: { descriptor: { provider_id: "local.test" } },
    });

    const unavailable = await router.select("text-generation", {
      required_schema_version: "3.0.0",
    });
    expect(unavailable).toMatchObject({ ok: false, error: { code: "NOVA-AI001" } });
  });

  it("falls back to a reachable local provider when cloud providers are down", async () => {
    const registry = new CapabilityRegistry();
    registry.register(
      "text-generation",
      provider({ provider_id: "cloud.test", privacy_class: "cloud" }, "down"),
    );
    registry.register(
      "text-generation",
      provider({ provider_id: "local.test", privacy_class: "local" }),
    );
    registry.setPolicy("text-generation", { policy: "cost-optimized" });
    const router = new ProviderRouter(registry);

    const selected = await router.select("text-generation", {});

    expect(selected).toMatchObject({
      ok: true,
      value: { descriptor: { provider_id: "local.test" } },
    });
  });

  it("honors a manual override even when the pinned provider is degraded", async () => {
    const registry = new CapabilityRegistry();
    registry.register("text-generation", provider({ provider_id: "cloud.test" }, "degraded"));
    registry.register("text-generation", provider({ provider_id: "local.test" }, "reachable"));
    registry.setPolicy("text-generation", { policy: "manual", manual_override: "cloud.test" });
    const router = new ProviderRouter(registry);

    const selected = await router.select("text-generation", {});

    expect(selected).toMatchObject({
      ok: true,
      value: { descriptor: { provider_id: "cloud.test" } },
    });
  });

  it("honors a manual provider override and falls back after invocation failure", async () => {
    const registry = new CapabilityRegistry();
    const failing = provider({ provider_id: "cloud.test", privacy_class: "cloud" });
    failing.invoke = vi.fn(async () => {
      throw new Error("offline");
    });
    const local = provider({ provider_id: "local.test", privacy_class: "local" });
    registry.register("text-generation", failing);
    registry.register("text-generation", local);
    registry.setPolicy("text-generation", { policy: "manual", manual_override: "cloud.test" });
    const router = new ProviderRouter(registry);

    const response = await router.invoke("text-generation", {});

    expect(response).toMatchObject({ ok: true, value: { provider_id: "local.test" } });
    expect(failing.invoke).toHaveBeenCalledOnce();
    expect(local.invoke).toHaveBeenCalledOnce();
  });

  it("records routing decisions with eliminations and final choice", async () => {
    const registry = new CapabilityRegistry();
    registry.register("text-generation", provider({ provider_id: "local.test" }));
    const router = new ProviderRouter(registry);

    await router.select("text-generation", { required_capabilities: ["vision"] });

    expect(router.decisions()).toMatchObject([
      { capability_id: "text-generation", final_provider_id: null },
    ]);
    expect(router.decisions()[0]?.eliminated).toEqual([
      { provider_id: "local.test", reason: "missing_capability" },
    ]);
  });
});
