import { describe, expect, it, vi } from "vitest";
import {
  ConfigurationStore,
  type ConfiguredCapabilityRecord,
  type NovaConfiguration,
} from "../src/configuration-store.js";
import { HardwareDetector, type HardwareProbe } from "../src/hardware-detection.js";
import { PermissionGrantStore } from "../src/permission-grant-store.js";
import { SetupWizard } from "../src/setup-wizard.js";
import type { SystemInventory } from "../src/system-inventory.js";

const config = (): NovaConfiguration => ({
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

const capability = (): ConfiguredCapabilityRecord => ({
  capability_id: "llm",
  domain: "text-generation",
  required: true,
  providers: [{ provider_id: "local.llm", enabled: true, priority: 1 }],
  active_policy: "privacy-first",
  manual_override: null,
});

const inventory = (): SystemInventory => ({
  scanned_at: "2026-08-23T00:00:00.000Z",
  hardware: probe(),
  installed_applications: [{ name: "Editor", version: "1.0.0" }],
  running_applications: [{ name: "Editor", process_id: 42 }],
  storage: { model_storage_path: "C:\\Nova\\models", available_disk_gb: 100 },
  granted_filesystem_scopes: [
    { path: "C:\\Users\\S K\\Documents", file_count: 3, folder_count: 1 },
  ],
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
        value: { llm: capability() },
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
        value: { llm: capability() },
      }),
    ).toMatchObject({ ok: true });
    expect(wizard.complete("perception")).toMatchObject({ ok: true });
    expect(
      wizard.complete("voice", {
        section: "voice",
        value: {
          enabled: true,
          wake_word: "nova",
          always_listening: false,
          barge_in_sensitivity: "conservative",
        },
      }),
    ).toMatchObject({ ok: true });
    expect(wizard.complete("devices")).toMatchObject({ ok: true });
    expect(wizard.complete("channels")).toMatchObject({ ok: true });
    expect(wizard.complete("plugins")).toMatchObject({ ok: true });
    expect(wizard.complete("routing")).toMatchObject({ ok: true });
    expect(wizard.complete("security")).toMatchObject({ ok: true });

    expect(wizard.summary()).toMatchObject({
      current_step: "summary",
      configuration: {
        capabilities: { llm: capability() },
        voice: {
          enabled: true,
          wake_word: "nova",
          always_listening: false,
          barge_in_sensitivity: "conservative",
        },
      },
    });
  });

  it("runs inventory only after application and filesystem permissions are granted", async () => {
    const events: string[] = [];
    const inventoryCollector = { collect: vi.fn(async () => inventory()) };
    const permissions = new PermissionGrantStore({
      initial: [
        { source: "applications", granted: false },
        { source: "filesystem", granted: false },
      ],
    });
    const wizard = new SetupWizard(
      new ConfigurationStore({ initial: config() }),
      new HardwareDetector(async () => {
        events.push("hardware");
        return probe();
      }),
      {
        inventory: inventoryCollector,
        permissions,
        grantedFilesystemScopes: () => ["C:\\Users\\S K\\Documents"],
      },
    );

    await expect(wizard.start()).rejects.toThrow("applications permission");
    expect(inventoryCollector.collect).not.toHaveBeenCalled();
    expect(events).toEqual(["hardware"]);

    permissions.update("applications", true);
    permissions.update("filesystem", true);
    const restarted = await wizard.rerun();

    expect(restarted.inventory).toEqual(inventory());
    expect(inventoryCollector.collect).toHaveBeenCalledTimes(1);
  });

  it("rejects inventory that reports a filesystem scope outside the approved paths", async () => {
    const permissions = new PermissionGrantStore({
      initial: [
        { source: "applications", granted: true },
        { source: "filesystem", granted: true },
      ],
    });
    const unauthorized = {
      ...inventory(),
      granted_filesystem_scopes: [
        { path: "C:\\Users\\S K\\Desktop", file_count: 9, folder_count: 2 },
      ],
    } satisfies SystemInventory;
    const wizard = new SetupWizard(
      new ConfigurationStore({ initial: config() }),
      new HardwareDetector(async () => probe()),
      {
        inventory: { collect: async () => unauthorized },
        permissions,
        grantedFilesystemScopes: () => ["C:\\Users\\S K\\Documents"],
      },
    );

    await expect(wizard.start()).rejects.toThrow("outside approved filesystem scopes");
  });

  it("keeps initial discovery aggregate-only in the setup snapshot", async () => {
    const permissions = new PermissionGrantStore({
      initial: [
        { source: "applications", granted: true },
        { source: "filesystem", granted: true },
      ],
    });
    const wizard = new SetupWizard(
      new ConfigurationStore({ initial: config() }),
      new HardwareDetector(async () => probe()),
      {
        inventory: { collect: async () => inventory() },
        permissions,
        grantedFilesystemScopes: () => ["C:\\Users\\S K\\Documents"],
      },
    );

    const state = await wizard.start();

    expect(state.inventory?.granted_filesystem_scopes).toEqual([
      { path: "C:\\Users\\S K\\Documents", file_count: 3, folder_count: 1 },
    ]);
    expect(state.inventory).not.toHaveProperty("file_names");
    expect(state.inventory).not.toHaveProperty("file_contents");
  });

  it("reruns without discarding existing configuration", async () => {
    const store = new ConfigurationStore({
      initial: { ...config(), capabilities: { llm: capability() } },
    });
    const detector = new HardwareDetector(vi.fn(async () => probe()));
    const wizard = new SetupWizard(store, detector);
    await wizard.start();
    wizard.complete("core-llm");

    const rerun = await wizard.rerun();

    expect(rerun.current_step).toBe("core-llm");
    expect(rerun.configuration.capabilities).toEqual({ llm: capability() });
    expect(detector.lastProfile()).toBeDefined();
  });
});
