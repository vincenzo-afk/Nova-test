import { describe, expect, it, vi } from "vitest";
import { ConfigurationStore, type NovaConfiguration } from "../src/configuration-store.js";
import { HardwareDetector, type HardwareProbe } from "../src/hardware-detection.js";
import { SetupWizard } from "../src/setup-wizard.js";

const config = (): NovaConfiguration => ({
  schema_version: "1.0.0",
  capabilities: {},
  devices: [],
  channels: [],
  plugins: [],
  mcp_servers: [],
  routing_policies: {},
  permissions: {},
  voice: {},
  personalization: {},
});
const probe = (): HardwareProbe => ({
  cpu_architecture: "x86_64",
  cpu_cores: 8,
  avx2: true,
  avx512: false,
  gpu_vendor: null,
  gpu_vram_gb: 0,
  gpu_accelerator: null,
  system_ram_gb: 8,
  available_disk_gb: 100,
  os: "linux",
  battery_powered: false,
});

describe("SetupWizard", () => {
  it("runs hardware detection first and exposes the core LLM step", async () => {
    const detector = new HardwareDetector(async () => probe());
    const wizard = new SetupWizard(new ConfigurationStore({ initial: config() }), detector);

    const state = await wizard.start();

    expect(state).toMatchObject({
      current_step: "core-llm",
      hardware: { overall_tier: "Minimal" },
    });
  });

  it("requires core LLM configuration but permits deferring optional steps", async () => {
    const wizard = new SetupWizard(
      new ConfigurationStore({ initial: config() }),
      new HardwareDetector(async () => probe()),
    );
    await wizard.start();

    expect(wizard.defer("core-llm")).toMatchObject({ ok: false, error: { code: "NOVA-CFG001" } });
    expect(
      wizard.complete("core-llm", {
        section: "capabilities",
        value: { llm: { provider_id: "local.llm" } },
      }),
    ).toMatchObject({ ok: true });
    expect(wizard.defer("perception")).toMatchObject({
      ok: true,
      value: { current_step: "voice" },
    });
  });

  it("writes step sections through the shared configuration store and reaches a summary", async () => {
    const store = new ConfigurationStore({ initial: config() });
    const wizard = new SetupWizard(store, new HardwareDetector(async () => probe()));
    await wizard.start();

    expect(
      wizard.complete("core-llm", {
        section: "capabilities",
        value: { llm: { provider_id: "local.llm" } },
      }),
    ).toMatchObject({ ok: true });
    expect(wizard.complete("perception")).toMatchObject({ ok: true });
    expect(wizard.complete("voice")).toMatchObject({ ok: true });
    expect(wizard.complete("devices")).toMatchObject({ ok: true });
    expect(wizard.complete("channels")).toMatchObject({ ok: true });
    expect(wizard.complete("plugins")).toMatchObject({ ok: true });
    expect(wizard.complete("routing")).toMatchObject({ ok: true });
    expect(wizard.complete("security")).toMatchObject({ ok: true });

    expect(wizard.summary()).toMatchObject({
      current_step: "summary",
      configuration: { capabilities: { llm: { provider_id: "local.llm" } } },
    });
  });

  it("reruns without discarding existing configuration", async () => {
    const store = new ConfigurationStore({
      initial: { ...config(), capabilities: { llm: { provider_id: "local.llm" } } },
    });
    const detector = new HardwareDetector(vi.fn(async () => probe()));
    const wizard = new SetupWizard(store, detector);
    await wizard.start();
    wizard.complete("core-llm");

    const rerun = await wizard.rerun();

    expect(rerun.current_step).toBe("core-llm");
    expect(rerun.configuration.capabilities).toEqual({ llm: { provider_id: "local.llm" } });
    expect(detector.lastProfile()).toBeDefined();
  });
});
