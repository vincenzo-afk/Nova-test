import { describe, expect, it, vi } from "vitest";
import type { Result, ServiceHealth, ServiceLifecycle } from "@nova/shared";
import { RuntimeManager } from "../src/runtime-manager.js";

class FakeService implements ServiceLifecycle {
  readonly calls: string[] = [];
  private currentHealth: ServiceHealth = {
    state: "Created",
    detail: "created",
    checkedAt: new Date(0).toISOString(),
    missedHeartbeats: 0,
  };

  constructor(
    readonly serviceName: string,
    private readonly shouldFailStart = false,
  ) {}

  async start(): Promise<Result<void>> {
    this.calls.push("start");
    if (this.shouldFailStart) {
      this.currentHealth = { ...this.currentHealth, state: "Failed", detail: "startup failed" };
      return {
        ok: false,
        error: { code: "NOVA-CFG001", message: "startup failed", retryable: false },
      };
    }
    this.currentHealth = { ...this.currentHealth, state: "Healthy", detail: "ready" };
    return { ok: true, value: undefined };
  }

  async stop(graceful: boolean): Promise<Result<void>> {
    this.calls.push(graceful ? "stop:graceful" : "stop:forced");
    this.currentHealth = { ...this.currentHealth, state: "Stopped", detail: "stopped" };
    return { ok: true, value: undefined };
  }

  heartbeat(): Result<{ serviceName: string; state: ServiceHealth["state"]; publishedAt: string }> {
    this.calls.push("heartbeat");
    this.currentHealth = { ...this.currentHealth, missedHeartbeats: 0 };
    return {
      ok: true,
      value: {
        serviceName: this.serviceName,
        state: this.currentHealth.state,
        publishedAt: new Date().toISOString(),
      },
    };
  }

  health(): ServiceHealth {
    return this.currentHealth;
  }
}

describe("RuntimeManager", () => {
  it("starts registered services in dependency order", async () => {
    const started: string[] = [];
    const makeService = (name: string) => {
      const service = new FakeService(name);
      vi.spyOn(service, "start").mockImplementation(async () => {
        started.push(name);
        return { ok: true, value: undefined };
      });
      return service;
    };
    const manager = new RuntimeManager({ now: () => 0 });
    manager.register(
      {
        name: "memory",
        dependencies: [],
        critical: true,
        restartWindowMs: 300_000,
        maxImmediateRestarts: 3,
        backoffCeilingMs: 30_000,
      },
      makeService("memory"),
    );
    manager.register(
      {
        name: "planner",
        dependencies: ["memory"],
        critical: false,
        restartWindowMs: 300_000,
        maxImmediateRestarts: 3,
        backoffCeilingMs: 30_000,
      },
      makeService("planner"),
    );

    const result = await manager.startAll();

    expect(result).toMatchObject({ ok: true });
    expect(started).toEqual(["memory", "planner"]);
  });

  it("rejects a dependency cycle before starting anything", async () => {
    const manager = new RuntimeManager({ now: () => 0 });
    manager.register(
      {
        name: "a",
        dependencies: ["b"],
        critical: true,
        restartWindowMs: 300_000,
        maxImmediateRestarts: 3,
        backoffCeilingMs: 30_000,
      },
      new FakeService("a"),
    );
    manager.register(
      {
        name: "b",
        dependencies: ["a"],
        critical: true,
        restartWindowMs: 300_000,
        maxImmediateRestarts: 3,
        backoffCeilingMs: 30_000,
      },
      new FakeService("b"),
    );

    const result = await manager.startAll();

    expect(result).toMatchObject({ ok: false, error: { code: "NOVA-EVT001", retryable: false } });
  });

  it("aborts startup when a critical service fails", async () => {
    const manager = new RuntimeManager({ now: () => 0 });
    manager.register(
      {
        name: "memory",
        dependencies: [],
        critical: true,
        restartWindowMs: 300_000,
        maxImmediateRestarts: 3,
        backoffCeilingMs: 30_000,
      },
      new FakeService("memory", true),
    );
    const dependent = new FakeService("planner");
    manager.register(
      {
        name: "planner",
        dependencies: ["memory"],
        critical: false,
        restartWindowMs: 300_000,
        maxImmediateRestarts: 3,
        backoffCeilingMs: 30_000,
      },
      dependent,
    );

    const result = await manager.startAll();

    expect(result).toMatchObject({ ok: false });
    expect(dependent.calls).toEqual([]);
  });

  it("continues in degraded mode when a non-critical service fails", async () => {
    const manager = new RuntimeManager({ now: () => 0 });
    manager.register(
      {
        name: "memory",
        dependencies: [],
        critical: true,
        restartWindowMs: 300_000,
        maxImmediateRestarts: 3,
        backoffCeilingMs: 30_000,
      },
      new FakeService("memory"),
    );
    manager.register(
      {
        name: "observer",
        dependencies: ["memory"],
        critical: false,
        restartWindowMs: 300_000,
        maxImmediateRestarts: 3,
        backoffCeilingMs: 30_000,
      },
      new FakeService("observer", true),
    );

    const result = await manager.startAll();

    expect(result).toEqual({ ok: true, value: { degradedServices: ["observer"] } });
  });

  it("restarts a service after three missed heartbeat intervals", async () => {
    let now = 0;
    const service = new FakeService("observer");
    const manager = new RuntimeManager({ now: () => now, heartbeatIntervalMs: 1_000 });
    manager.register(
      {
        name: "observer",
        dependencies: [],
        critical: false,
        restartWindowMs: 300_000,
        maxImmediateRestarts: 3,
        backoffCeilingMs: 30_000,
      },
      service,
    );
    await manager.startAll();

    now = 3_001;
    await manager.checkHeartbeats();

    expect(service.calls).toContain("stop:forced");
    expect(service.calls.filter((call) => call === "start")).toHaveLength(2);
  });

  it("marks a repeatedly failing service degraded instead of restarting forever", async () => {
    let now = 0;
    const service = new FakeService("unstable", true);
    const manager = new RuntimeManager({ now: () => now, heartbeatIntervalMs: 1_000 });
    manager.register(
      {
        name: "unstable",
        dependencies: [],
        critical: false,
        restartWindowMs: 300_000,
        maxImmediateRestarts: 3,
        backoffCeilingMs: 250,
      },
      service,
    );

    await manager.startAll();
    for (let attempt = 0; attempt < 4; attempt += 1) {
      now += 3_001;
      await manager.checkHeartbeats();
    }

    expect(manager.health("unstable")).toMatchObject({ state: "Degraded" });
    expect(service.calls.filter((call) => call === "start").length).toBeLessThanOrEqual(4);
  });
});
