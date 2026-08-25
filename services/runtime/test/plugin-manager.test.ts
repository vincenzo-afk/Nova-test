import { describe, expect, it, vi } from "vitest";
import { MemoryLogSink, StructuredLogger } from "@nova/shared";
import { PluginManager, type PluginManifest, type PluginProcess } from "../src/plugin-manager.js";

const manifest = (overrides: Partial<PluginManifest> = {}): PluginManifest => ({
  plugin_id: "com.example.reader",
  version: "1.0.0",
  nova_api_version_range: ">=1.0.0 <2.0.0",
  display_name: "Reader",
  description: "Reads documents",
  provided_tools: ["tool.reader"],
  required_permissions: ["files.read"],
  optional_permissions: [],
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

  it("lists bounded plugin state summaries without manifest or execution metadata", () => {
    const manager = new PluginManager({ novaApiVersion: "1.1.0" });
    manager.install(manifest({ plugin_id: "com.example.zeta", provided_tools: ["tool.z"] }));
    manager.install(
      manifest({
        plugin_id: "com.example.alpha",
        provided_tools: ["tool.a", "tool.b"],
        required_permissions: ["files.read", "memory.read"],
        entry_point: "/sensitive/plugin/path.js",
      }),
    );

    expect(manager.listSummaries()).toEqual([
      {
        plugin_id: "com.example.alpha",
        version: "1.0.0",
        state: "Installed",
        provided_tool_count: 2,
        required_permission_count: 2,
      },
      {
        plugin_id: "com.example.zeta",
        version: "1.0.0",
        state: "Installed",
        provided_tool_count: 1,
        required_permission_count: 1,
      },
    ]);
  });

  it("rejects malformed manifests without installing them", () => {
    const manager = new PluginManager({ novaApiVersion: "1.1.0" });
    const invalid = { ...manifest(), version: "not-semver", provided_tools: [""] };

    expect(manager.install(invalid)).toMatchObject({ ok: false, error: { code: "NOVA-CFG001" } });
    expect(manager.get("com.example.reader")).toMatchObject({
      ok: false,
      error: { code: "NOVA-PLG005" },
    });
  });

  it("rejects permission scopes outside the canonical vocabulary and duplicate declarations", () => {
    const manager = new PluginManager({ novaApiVersion: "1.1.0" });

    expect(
      manager.install(
        manifest({
          required_permissions: ["files.read", "files.read"],
          optional_permissions: ["not-a-real-scope"],
        }),
      ),
    ).toMatchObject({ ok: false, error: { code: "NOVA-CFG001" } });
  });

  it("rejects incompatible SDK ranges before sandboxing", async () => {
    const sandbox = vi.fn(async () => true);
    const manager = new PluginManager({ novaApiVersion: "2.0.0", sandbox });
    manager.install(manifest());

    const result = await manager.enable("com.example.reader");

    expect(result).toMatchObject({ ok: false, error: { code: "NOVA-PLG004" } });
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
      error: { code: "NOVA-PLG001" },
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
      error: { code: "NOVA-PLG001" },
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

    expect(result).toMatchObject({ ok: false, error: { code: "NOVA-SEC002" } });
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

    expect(result).toMatchObject({ ok: false, error: { code: "NOVA-PLG006" } });
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

  it("blocks disabling a plugin with enabled dependents and lists every affected plugin", async () => {
    const sink = new MemoryLogSink();
    const manager = new PluginManager({
      novaApiVersion: "1.1.0",
      reviewPermission: async () => true,
      processFactory: () => process(),
      logger: new StructuredLogger({ service: "runtime.plugins", sink }),
    });
    manager.install(manifest({ plugin_id: "plugin.base", provided_tools: ["tool.base"] }));
    manager.install(
      manifest({
        plugin_id: "plugin.dependent",
        provided_tools: ["tool.dependent"],
        dependencies: [{ plugin_id: "plugin.base", version_range: ">=1.0.0" }],
      }),
    );
    await manager.enable("plugin.base");
    await manager.enable("plugin.dependent");

    const blocked = await manager.disable("plugin.base");

    expect(blocked).toMatchObject({
      ok: false,
      error: { code: "NOVA-PLG005", details: { dependent_plugin_ids: ["plugin.dependent"] } },
    });
    expect(manager.get("plugin.base")).toMatchObject({ value: { state: "Enabled" } });
    expect(manager.get("plugin.dependent")).toMatchObject({ value: { state: "Enabled" } });
    expect(sink.records().at(-1)?.event).toBe("plugin.disable.blocked");
    expect(sink.records().at(-1)?.details).toMatchObject({
      plugin_id: "plugin.base",
      dependent_count: 1,
      reason: "enabled_dependents",
    });
  });

  it("requires explicit confirmation before a forced dependent cascade", async () => {
    const manager = new PluginManager({
      novaApiVersion: "1.1.0",
      reviewPermission: async () => true,
      processFactory: () => process(),
    });
    manager.install(manifest({ plugin_id: "plugin.base", provided_tools: ["tool.base"] }));
    manager.install(
      manifest({
        plugin_id: "plugin.dependent",
        provided_tools: ["tool.dependent"],
        dependencies: [{ plugin_id: "plugin.base", version_range: ">=1.0.0" }],
      }),
    );
    await manager.enable("plugin.base");
    await manager.enable("plugin.dependent");

    const unconfirmed = await manager.disable("plugin.base", { force: true });

    expect(unconfirmed).toMatchObject({
      ok: false,
      error: { code: "NOVA-PLG005", details: { dependent_plugin_ids: ["plugin.dependent"] } },
    });
  });

  it("force-disables every affected dependent only after naming and confirming the cascade", async () => {
    const manager = new PluginManager({
      novaApiVersion: "1.1.0",
      reviewPermission: async () => true,
      processFactory: () => process(),
    });
    manager.install(manifest({ plugin_id: "plugin.base", provided_tools: ["tool.base"] }));
    manager.install(
      manifest({
        plugin_id: "plugin.dependent",
        provided_tools: ["tool.dependent"],
        dependencies: [{ plugin_id: "plugin.base", version_range: ">=1.0.0" }],
      }),
    );
    await manager.enable("plugin.base");
    await manager.enable("plugin.dependent");
    const confirmDependents = vi.fn(async (dependentIds: readonly string[]) => {
      expect(dependentIds).toEqual(["plugin.dependent"]);
      return true;
    });

    const disabled = await manager.disable("plugin.base", {
      force: true,
      confirmDependents,
    });

    expect(disabled).toMatchObject({ ok: true, value: { state: "Disabled" } });
    expect(confirmDependents).toHaveBeenCalledOnce();
    expect(manager.get("plugin.base")).toMatchObject({ value: { state: "Disabled" } });
    expect(manager.get("plugin.dependent")).toMatchObject({ value: { state: "Disabled" } });
  });

  it("blocks uninstall while enabled dependents exist and supports the same confirmed cascade", async () => {
    const manager = new PluginManager({
      novaApiVersion: "1.1.0",
      reviewPermission: async () => true,
      processFactory: () => process(),
    });
    manager.install(manifest({ plugin_id: "plugin.base", provided_tools: ["tool.base"] }));
    manager.install(
      manifest({
        plugin_id: "plugin.dependent",
        provided_tools: ["tool.dependent"],
        dependencies: [{ plugin_id: "plugin.base", version_range: ">=1.0.0" }],
      }),
    );
    await manager.enable("plugin.base");
    await manager.enable("plugin.dependent");

    expect(await manager.uninstall("plugin.base")).toMatchObject({
      ok: false,
      error: { code: "NOVA-PLG005", details: { dependent_plugin_ids: ["plugin.dependent"] } },
    });
    expect(
      await manager.uninstall("plugin.base", {
        force: true,
        confirmDependents: async () => true,
      }),
    ).toMatchObject({ ok: true });
    expect(manager.get("plugin.base")).toMatchObject({
      ok: false,
      error: { code: "NOVA-PLG005" },
    });
    expect(manager.get("plugin.dependent")).toMatchObject({ value: { state: "Disabled" } });
  });

  it("reviews each declared permission independently and keeps only granted scopes", async () => {
    const review = vi.fn(
      async ({ permission }: { readonly permission: string }) => permission === "files.read",
    );
    const manager = new PluginManager({ novaApiVersion: "1.1.0", reviewPermission: review });
    manager.install(
      manifest({
        required_permissions: ["files.read"],
        optional_permissions: ["network.external"],
      }),
    );

    const enabled = await manager.enable("com.example.reader");

    expect(enabled).toMatchObject({
      ok: true,
      value: { state: "Enabled", granted_permissions: ["files.read"] },
    });
    expect(review).toHaveBeenCalledTimes(2);
    expect(review).toHaveBeenNthCalledWith(1, {
      plugin_id: "com.example.reader",
      permission: "files.read",
      required: true,
    });
    expect(review).toHaveBeenNthCalledWith(2, {
      plugin_id: "com.example.reader",
      permission: "network.external",
      required: false,
    });
  });

  it("keeps a plugin enabled when a required scope is denied but blocks its invocation", async () => {
    const manager = new PluginManager({
      novaApiVersion: "1.1.0",
      reviewPermission: async () => false,
    });
    manager.install(manifest({ required_permissions: ["files.read"] }));
    await manager.enable("com.example.reader");

    expect(
      manager.authorizeToolInvocation("com.example.reader", "tool.reader", "files.read"),
    ).toMatchObject({
      ok: false,
      error: { code: "NOVA-SEC004" },
    });
  });

  it("revokes a granted scope immediately and blocks undeclared scope access", async () => {
    const manager = new PluginManager({
      novaApiVersion: "1.1.0",
      reviewPermission: async () => true,
    });
    manager.install(manifest({ required_permissions: ["files.read"] }));
    await manager.enable("com.example.reader");

    expect(
      manager.authorizeToolInvocation("com.example.reader", "tool.reader", "files.read"),
    ).toMatchObject({ ok: true });
    expect(manager.revokePermission("com.example.reader", "files.read")).toMatchObject({
      ok: true,
    });
    expect(
      manager.authorizeToolInvocation("com.example.reader", "tool.reader", "files.read"),
    ).toMatchObject({
      ok: false,
      error: { code: "NOVA-SEC004" },
    });
    expect(
      manager.authorizeToolInvocation("com.example.reader", "tool.reader", "network.external"),
    ).toMatchObject({
      ok: false,
      error: { code: "NOVA-PLG003" },
    });
  });

  it("emits bounded structured permission diagnostics without sensitive manifest content", async () => {
    const sink = new MemoryLogSink();
    const manager = new PluginManager({
      novaApiVersion: "1.1.0",
      reviewPermission: async () => false,
      logger: new StructuredLogger({ service: "runtime.plugins", sink }),
    });
    manager.install(
      manifest({
        description: "secret token should never be logged",
        required_permissions: ["files.read"],
      }),
    );
    await manager.enable("com.example.reader");
    manager.authorizeToolInvocation("com.example.reader", "tool.reader", "files.read");
    manager.revokePermission("com.example.reader", "files.read");

    const serialized = JSON.stringify(sink.records());
    expect(sink.records().map((record) => record.event)).toEqual([
      "plugin.permission.reviewed",
      "plugin.invocation.blocked",
      "plugin.permission.revoked",
    ]);
    expect(serialized).not.toContain("secret token should never be logged");
    expect(serialized).not.toMatch(/token|password|credential|api[_-]?key/i);
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
      error: { code: "NOVA-PLG005" },
    });
  });
});
