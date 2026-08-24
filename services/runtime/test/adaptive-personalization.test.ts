import { describe, expect, it } from "vitest";
import { MemoryLogSink, StructuredLogger } from "@nova/shared";
import { ConfigurationStore, type NovaConfiguration } from "../src/configuration-store.js";
import {
  AdaptivePersonalization,
  type AdaptivePreferenceInput,
} from "../src/adaptive-personalization.js";

const base = (): NovaConfiguration => ({
  schema_version: "1.0.0",
  capabilities: {},
  devices: [],
  channels: [],
  plugins: [],
  mcp_servers: [],
  routing_policies: {},
  permissions: {},
  voice: {
    enabled: false,
    wake_word: "nova",
    always_listening: false,
    barge_in_sensitivity: "conservative",
  },
  personalization: { preferences: [] },
});

const preference = (): AdaptivePreferenceInput => ({
  id: "tone.concise",
  category: "tone",
  value: { style: "concise" },
});

describe("AdaptivePersonalization", () => {
  it("creates an inspectable proposal without mutating configuration", () => {
    const store = new ConfigurationStore({ initial: base() });
    const adaptive = new AdaptivePersonalization(store, () => "2026-08-24T12:00:00.000Z");

    const proposal = adaptive.propose(preference());

    expect(proposal).toMatchObject({
      ok: true,
      value: {
        proposal_id: "tone.concise",
        status: "pending",
        preference: { id: "tone.concise", source: "feedback" },
      },
    });
    expect(store.snapshot().personalization.preferences).toEqual([]);
  });

  it("persists a proposed preference only after explicit approval and can reset it", () => {
    const store = new ConfigurationStore({ initial: base() });
    const adaptive = new AdaptivePersonalization(store, () => "2026-08-24T12:00:00.000Z");
    adaptive.propose(preference());

    expect(adaptive.approve("tone.concise")).toMatchObject({ ok: true });
    expect(store.snapshot().personalization.preferences).toEqual([
      {
        id: "tone.concise",
        category: "tone",
        value: { style: "concise" },
        enabled: true,
        source: "feedback",
        updated_at: "2026-08-24T12:00:00.000Z",
      },
    ]);
    expect(adaptive.reset("tone.concise")).toMatchObject({ ok: true });
    expect(store.snapshot().personalization.preferences).toEqual([]);
  });

  it("suggests a routing preference after repeated overrides without changing routing policy", () => {
    const store = new ConfigurationStore({
      initial: {
        ...base(),
        routing_policies: { llm: { policy: "latency-optimized" } },
      },
    });
    const adaptive = new AdaptivePersonalization(store);

    expect(
      adaptive.suggestRoutingPreference({
        capability_id: "llm",
        provider_id: "local.llm",
        manual_override_count: 4,
      }),
    ).toBeUndefined();
    const proposal = adaptive.suggestRoutingPreference({
      capability_id: "llm",
      provider_id: "local.llm",
      manual_override_count: 5,
    });

    expect(proposal).toMatchObject({
      ok: true,
      value: {
        status: "pending",
        preference: {
          category: "routing-preference",
          value: { capability_id: "llm", provider_id: "local.llm" },
        },
      },
    });
    expect(store.snapshot().routing_policies).toEqual({
      llm: { policy: "latency-optimized" },
    });
  });

  it("dismisses a proposal and emits bounded diagnostics without model or payload data", () => {
    const sink = new MemoryLogSink();
    const store = new ConfigurationStore({ initial: base() });
    const adaptive = new AdaptivePersonalization(
      store,
      () => "2026-08-24T12:00:00.000Z",
      new StructuredLogger({ service: "runtime.personalization", sink }),
    );
    adaptive.propose(preference());

    expect(adaptive.dismiss("tone.concise")).toMatchObject({ ok: true });
    expect(adaptive.pending()).toEqual([]);
    expect(sink.records().map((record) => record.event)).toEqual([
      "personalization.proposal.created",
      "personalization.proposal.dismissed",
    ]);
    expect(JSON.stringify(sink.records())).not.toContain("style");
    expect(JSON.stringify(sink.records())).not.toContain("model");
  });
});
