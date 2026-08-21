import { describe, expect, it } from "vitest";
import { LifecycleStateMachine } from "../src/service-lifecycle.js";

describe("LifecycleStateMachine", () => {
  it.each([
    ["Created", "Initializing"],
    ["Initializing", "Healthy"],
    ["Initializing", "Failed"],
    ["Healthy", "Degraded"],
    ["Healthy", "Stopping"],
    ["Degraded", "Healthy"],
    ["Degraded", "Stopping"],
    ["Degraded", "Restarting"],
    ["Failed", "Restarting"],
    ["Restarting", "Initializing"],
    ["Restarting", "Failed"],
    ["Stopping", "Stopped"],
  ] as const)("allows %s -> %s", (from, to) => {
    const machine = new LifecycleStateMachine(from);

    const result = machine.transition(to);

    expect(result).toEqual({ ok: true, value: to });
    expect(machine.state()).toBe(to);
  });

  it.each([
    ["Created", "Healthy"],
    ["Healthy", "Restarting"],
    ["Failed", "Healthy"],
    ["Stopped", "Initializing"],
    ["Stopping", "Healthy"],
  ] as const)("rejects illegal transition %s -> %s", (from, to) => {
    const machine = new LifecycleStateMachine(from);

    const result = machine.transition(to);

    expect(result).toMatchObject({ ok: false, error: { retryable: false } });
    expect(machine.state()).toBe(from);
  });

  it("does not allow a terminal stopped service to transition again", () => {
    const machine = new LifecycleStateMachine("Stopping");

    expect(machine.transition("Stopped").ok).toBe(true);
    expect(machine.transition("Created")).toMatchObject({ ok: false });
  });
});
