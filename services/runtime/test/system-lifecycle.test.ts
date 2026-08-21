import { describe, expect, it } from "vitest";
import { shutdownSteps, startupSteps, type Result } from "@nova/shared";
import { SystemLifecycleOrchestrator } from "../src/system-lifecycle.js";

describe("SystemLifecycleOrchestrator", () => {
  it("executes the documented startup sequence exactly", async () => {
    const executed: string[] = [];
    const orchestrator = new SystemLifecycleOrchestrator(
      startupSteps.map((name) => ({
        name,
        run: async (): Promise<Result<void>> => {
          executed.push(name);
          return { ok: true, value: undefined };
        },
      })),
    );

    const result = await orchestrator.start();

    expect(result).toEqual({ ok: true, value: undefined });
    expect(executed).toEqual(startupSteps);
    expect(orchestrator.startupLog()).toEqual(startupSteps);
  });

  it("executes the documented shutdown sequence exactly", async () => {
    const executed: string[] = [];
    const orchestrator = new SystemLifecycleOrchestrator(
      startupSteps.map((name) => ({ name, run: async () => ({ ok: true, value: undefined }) })),
      shutdownSteps.map((name) => ({
        name,
        run: async (): Promise<Result<void>> => {
          executed.push(name);
          return { ok: true, value: undefined };
        },
      })),
    );

    const result = await orchestrator.stop();

    expect(result).toEqual({ ok: true, value: undefined });
    expect(executed).toEqual(shutdownSteps);
    expect(orchestrator.shutdownLog()).toEqual(shutdownSteps);
  });

  it("stops startup at the first failed step and returns its stable error", async () => {
    const executed: string[] = [];
    const orchestrator = new SystemLifecycleOrchestrator(
      startupSteps.map((name, index) => ({
        name,
        run: async (): Promise<Result<void>> => {
          executed.push(name);
          if (index === 4) {
            return {
              ok: false,
              error: { code: "NOVA-CFG001", message: "runtime manager failed", retryable: false },
            };
          }
          return { ok: true, value: undefined };
        },
      })),
    );

    const result = await orchestrator.start();

    expect(result).toMatchObject({ ok: false, error: { code: "NOVA-CFG001" } });
    expect(executed).toEqual(startupSteps.slice(0, 5));
  });
});
