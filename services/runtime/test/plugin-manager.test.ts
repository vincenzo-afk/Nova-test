import { describe, expect, it, vi } from "vitest";
import { PluginManager, type PluginManifest, type PluginProcess } from "../src/plugin-manager.js";

const manifest = (overrides: Partial<PluginManifest> = {}): PluginManifest => ({
  plugin_id: "com.example.reader",
  version: "1.0.0",
  nova_api_version_range: ">=1.0.0 <2.0.0",
  display_name: "Reader",
  description: "Reads documents",
  provided_tools: ["tool.reader"],
  required_permissions: ["filesystem.read"],
  dependencies: [],
  entry_point: "plugin.js",
  ...overrides,
});

const process = (): PluginProcess => ({
  start: vi.fn(async () => undefined),
  stop: vi.fn(async () => undefined),
});

describe("PluginManager", () => {
  it("validates manifests and enables only compatible plugins after verify, sandbox, and load", async () => {
    const order: string[] = [];
    const pluginProcess = process();
    const manager = new PluginManager({
      novaApiVersion: "1.1.0",
      verify: vi.fn(async () => {
        order.push("verify");
        return true;
      }),
      sandbox: vi.fn(async () => {
        order.push("sandbox");
        return true;
      }),
      processFactory: vi.fn(() => {
        order.push("load");
        return pluginProcess;
      }),
    });

    expect(manager.install(manifest())).toMatchObject({ ok: true, value: { state: "Installed" } });
    const enabled = await manager.enable("com.example.reader");

    expect(enabled).toMatchObject({ ok: true, value: { state: "Enabled" } });
    expect(order).toEqual(["verify", "sandbox", "load"]);
    expect(pluginProcess.start).toHaveBeenCalledOnce();
  });

  it("rejects malformed manifests without installing them", () => {
    const manager = new PluginManager({ novaApiVersion: "1.1.0" });
    const invalid = { ...manifest(), version: "not-semver", provided_tools: [""] };

    expect(manager.install(invalid)).toMatchObject({ ok: false, error: { code: "NOVA-PLG001" } });
    expect(manager.get("com.example.reader")).toMatchObject({
      ok: false,
      error: { code: "NOVA-PLG001" },
    });
  });

  it("rejects incompatible SDK ranges before sandboxing", async () => {
    const sandbox = vi.fn(async () => true);
    const manager = new PluginManager({ novaApiVersion: "2.0.0", sandbox });
    manager.install(manifest());

    const result = await manager.enable("com.example.reader");

    expect(result).toMatchObject({ ok: false, error: { code: "NOVA-PLG002" } });
    expect(sandbox).not.toHaveBeenCalled();
  });

  it("blocks dependency cycles and missing dependencies", async () => {
    const manager = new PluginManager({ novaApiVersion: "1.1.0" });
    manager.install(
      manifest({
        plugin_id: "plugin.a",
        dependencies: [{ plugin_id: "plugin.b", version_range: ">=1.0.0" }],
      }),
    );

    expect(await manager.enable("plugin.a")).toMatchObject({
      ok: false,
      error: { code: "NOVA-PLG002" },
    });

    const cycleManager = new PluginManager({ novaApiVersion: "1.1.0" });
    cycleManager.install(
      manifest({
        plugin_id: "plugin.a",
        dependencies: [{ plugin_id: "plugin.b", version_range: ">=1.0.0" }],
      }),
    );
    cycleManager.install(
      manifest({
        plugin_id: "plugin.b",
        dependencies: [{ plugin_id: "plugin.a", version_range: ">=1.0.0" }],
      }),
    );

    expect(await cycleManager.enable("plugin.a")).toMatchObject({
      ok: false,
      error: { code: "NOVA-PLG002" },
    });
  });

  it("halts before sandbox or load when verification fails", async () => {
    const sandbox = vi.fn(async () => true);
    const processFactory = vi.fn(() => process());
    const manager = new PluginManager({
      novaApiVersion: "1.1.0",
      verify: async () => false,
      sandbox,
      processFactory,
    });
    manager.install(manifest());

    const result = await manager.enable("com.example.reader");

    expect(result).toMatchObject({ ok: false, error: { code: "NOVA-PLG001" } });
    expect(sandbox).not.toHaveBeenCalled();
    expect(processFactory).not.toHaveBeenCalled();
    expect(manager.get("com.example.reader")).toMatchObject({
      ok: true,
      value: { state: "Failed" },
    });
  });

  it("halts before loading code when sandbox provisioning fails", async () => {
    const processFactory = vi.fn(() => process());
    const manager = new PluginManager({
      novaApiVersion: "1.1.0",
      sandbox: async () => false,
      processFactory,
    });
    manager.install(manifest());

    const result = await manager.enable("com.example.reader");

    expect(result).toMatchObject({ ok: false, error: { code: "NOVA-PLG001" } });
    expect(processFactory).not.toHaveBeenCalled();
  });

  it("disables plugins, stops the external process, and deregisters tools", async () => {
    const pluginProcess = process();
    const deregisterTools = vi.fn(async () => undefined);
    const manager = new PluginManager({
      novaApiVersion: "1.1.0",
      processFactory: () => pluginProcess,
      deregisterTools,
    });
    manager.install(manifest());
    await manager.enable("com.example.reader");

    const disabled = await manager.disable("com.example.reader");

    expect(disabled).toMatchObject({ ok: true, value: { state: "Disabled" } });
    expect(pluginProcess.stop).toHaveBeenCalledOnce();
    expect(deregisterTools).toHaveBeenCalledWith(["tool.reader"]);
  });

  it("uninstalls only after disable cleanup and removes the record", async () => {
    const pluginProcess = process();
    const deregisterTools = vi.fn(async () => undefined);
    const manager = new PluginManager({
      novaApiVersion: "1.1.0",
      processFactory: () => pluginProcess,
      deregisterTools,
    });
    manager.install(manifest());
    await manager.enable("com.example.reader");

    expect(await manager.uninstall("com.example.reader")).toMatchObject({ ok: true });
    expect(pluginProcess.stop).toHaveBeenCalledOnce();
    expect(deregisterTools).toHaveBeenCalledWith(["tool.reader"]);
    expect(manager.get("com.example.reader")).toMatchObject({
      ok: false,
      error: { code: "NOVA-PLG001" },
    });
  });
});
