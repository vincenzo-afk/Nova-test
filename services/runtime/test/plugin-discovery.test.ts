import { describe, expect, it, vi } from "vitest";
import { MemoryLogSink, StructuredLogger } from "@nova/shared";
import {
  PluginDiscovery,
  type PluginIndexEntry,
  type CapabilityGap,
} from "../src/plugin-discovery.js";

const gap = (overrides: Partial<CapabilityGap> = {}): CapabilityGap => ({
  capability_id: "messaging",
  domain: "messaging",
  enabled_provider_count: 0,
  ...overrides,
});

const candidate = (overrides: Partial<PluginIndexEntry> = {}): PluginIndexEntry => ({
  plugin_id: "telegram.plugin",
  latest_version: "1.2.0",
  publisher: "trusted-publisher",
  source_url: "https://registry.example/plugins/telegram.plugin",
  signature_key: "publisher-key-1",
  capabilities: ["messaging"],
  required_permissions: ["network.external"],
  trust: {
    verified_publisher: true,
    security_reviewed: true,
    download_count: 1000,
  },
  ...overrides,
});

describe("PluginDiscovery", () => {
  it("ranks vetted candidates by capability match, trust, and lower permission scope", async () => {
    const search = vi.fn(async () => [
      candidate({
        plugin_id: "broad.plugin",
        capabilities: ["messaging", "calendar"],
        required_permissions: ["network.external", "files.read"],
        trust: { verified_publisher: false, security_reviewed: false, download_count: 10 },
      }),
      candidate({
        plugin_id: "trusted.plugin",
        trust: { verified_publisher: true, security_reviewed: true, download_count: 100 },
      }),
      candidate({
        plugin_id: "exact.plugin",
        capabilities: ["messaging"],
        required_permissions: [],
        trust: { verified_publisher: true, security_reviewed: true, download_count: 100 },
      }),
    ]);
    const discovery = new PluginDiscovery({ search });

    const result = await discovery.discover(gap());

    expect(result).toMatchObject({
      ok: true,
      value: {
        capability_id: "messaging",
        proposals: [
          { plugin_id: "exact.plugin", status: "pending" },
          { plugin_id: "trusted.plugin", status: "pending" },
          { plugin_id: "broad.plugin", status: "pending" },
        ],
      },
    });
    expect(search).toHaveBeenCalledWith("messaging");
  });

  it("never discovers when an enabled provider already satisfies the capability", async () => {
    const search = vi.fn(async () => [candidate()]);
    const discovery = new PluginDiscovery({ search });

    const result = await discovery.discover(gap({ enabled_provider_count: 1 }));

    expect(result).toMatchObject({ ok: true, value: { proposals: [] } });
    expect(search).not.toHaveBeenCalled();
  });

  it("keeps proposals pending and confirms discovery without installing anything", async () => {
    const install = vi.fn();
    const discovery = new PluginDiscovery({
      search: async () => [candidate()],
      install,
    });

    const discovered = await discovery.discover(gap());
    expect(discovered.ok).toBe(true);
    expect(discovery.confirm("telegram.plugin")).toMatchObject({
      ok: true,
      value: { plugin_id: "telegram.plugin", status: "approved" },
    });
    expect(install).not.toHaveBeenCalled();
  });

  it("remembers a declined proposal for the session and allows a later explicit rediscovery", async () => {
    const discovery = new PluginDiscovery({ search: async () => [candidate()] });

    await discovery.discover(gap());
    expect(discovery.decline("telegram.plugin")).toMatchObject({ ok: true });
    expect((await discovery.discover(gap())).value).toMatchObject({ proposals: [] });
    expect(
      (await discovery.discover(gap({ capability_id: "messaging", force: true }))).value,
    ).toMatchObject({
      proposals: [{ plugin_id: "telegram.plugin" }],
    });
  });

  it("emits bounded discovery diagnostics without URLs, descriptions, permissions, or arbitrary payloads", async () => {
    const sink = new MemoryLogSink();
    const discovery = new PluginDiscovery({
      search: async () => [candidate({ source_url: "https://registry.example/private-secret" })],
      logger: new StructuredLogger({ service: "runtime.plugin-discovery", sink }),
    });

    await discovery.discover(gap());

    expect(sink.records().map((record) => record.event)).toEqual([
      "plugin.discovery.started",
      "plugin.discovery.completed",
      "plugin.discovery.proposal.created",
    ]);
    const serialized = JSON.stringify(sink.records());
    expect(serialized).not.toContain("private-secret");
    expect(serialized).not.toContain("network.external");
  });
});
