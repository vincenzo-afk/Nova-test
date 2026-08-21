import { describe, expect, it } from "vitest";
import { RuntimeManager } from "../src/runtime-manager.js";
import type { Result, ServiceDefinition, ServiceHealth, ServiceLifecycle } from "@nova/shared";

const definition: ServiceDefinition = {
  name: "unstable-service",
  dependencies: [],
  critical: false,
  restartWindowMs: 10_000,
  maxImmediateRestarts: 1,
  backoffCeilingMs: 500,
};

const serviceFixture = (
  startResults: Result<void>[],
): ServiceLifecycle & { starts: number; stops: number } => {
  let state: ServiceHealth["state"] = "Healthy";
  let starts = 0;
  let stops = 0;
  return {
    get starts() {
      return starts;
    },
    get stops() {
      return stops;
    },
    async start() {
      starts += 1;
      const result = startResults.shift() ?? { ok: true as const, value: undefined };
      state = result.ok ? "Healthy" : "Failed";
      return result;
    },
    async stop() {
      stops += 1;
      state = "Stopped";
      return { ok: true as const, value: undefined };
    },
    heartbeat() {
      return {
        ok: true as const,
        value: { serviceName: definition.name, state, publishedAt: new Date().toISOString() },
      };
    },
    health() {
      return { state, detail: "fixture", checkedAt: new Date().toISOString(), missedHeartbeats: 0 };
    },
  };
};

describe("RuntimeManager chaos recovery", () => {
  it("restarts a service after a heartbeat fault and restores healthy state", async () => {
    let now = 0;
    const service = serviceFixture([
      { ok: true, value: undefined },
      { ok: true, value: undefined },
    ]);
    const manager = new RuntimeManager({ now: () => now, heartbeatIntervalMs: 100 });
    expect(manager.register(definition, service).ok).toBe(true);
    await manager.startAll();

    now = 301;
    await manager.checkHeartbeats();

    expect(service.starts).toBe(2);
    expect(service.stops).toBe(1);
    expect(manager.health(definition.name).state).toBe("Healthy");
  });

  it("marks a repeatedly failing service degraded after the restart budget is exhausted", async () => {
    let now = 0;
    const service = serviceFixture([
      { ok: true, value: undefined },
      { ok: false, error: { code: "NOVA-CFG001", message: "crashed", retryable: true } },
      { ok: false, error: { code: "NOVA-CFG001", message: "still crashed", retryable: true } },
    ]);
    const manager = new RuntimeManager({ now: () => now, heartbeatIntervalMs: 100 });
    expect(manager.register(definition, service).ok).toBe(true);
    await manager.startAll();

    now = 301;
    await manager.checkHeartbeats();
    now = 602;
    await manager.checkHeartbeats();

    expect(manager.health(definition.name).state).toBe("Degraded");
    expect(manager.health(definition.name).detail).toContain("Restart budget exhausted");
  });
});
