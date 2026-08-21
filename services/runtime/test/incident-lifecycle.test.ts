import { describe, expect, it } from "vitest";
import { IncidentManager } from "../src/incident-lifecycle.js";

describe("IncidentManager", () => {
  it("records every incident stage with owner and timestamps", () => {
    let now = 1000;
    const manager = new IncidentManager({ now: () => now, owner: "vincenzo-afk" });

    expect(manager.detect("provider outage")).toMatchObject({
      ok: true,
      value: { stage: "Detected" },
    });
    now = 2000;
    expect(manager.triage("inc-1", "High")).toMatchObject({
      ok: true,
      value: { stage: "Triaged" },
    });
    now = 3000;
    expect(manager.mitigate("inc-1", "fallback")).toMatchObject({
      ok: true,
      value: { stage: "Mitigated" },
    });
    now = 4000;
    expect(manager.resolve("inc-1", "provider restored")).toMatchObject({
      ok: true,
      value: { stage: "Resolved" },
    });
    now = 5000;
    expect(manager.postmortem("inc-1", "root cause documented")).toMatchObject({
      ok: true,
      value: { stage: "Postmortem" },
    });

    expect(manager.timeline("inc-1")).toHaveLength(5);
    expect(
      manager
        .timeline("inc-1")
        .every((entry) => entry.owner === "vincenzo-afk" && typeof entry.timestamp === "number"),
    ).toBe(true);
  });

  it("rejects invalid stage transitions", () => {
    const manager = new IncidentManager({ owner: "vincenzo-afk" });

    expect(manager.resolve("missing", "unknown")).toMatchObject({
      ok: false,
      error: { code: "NOVA-EVT002" },
    });
  });
});
