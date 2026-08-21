import { describe, expect, it } from "vitest";
import { compareDeviceVersions, LogicalClock } from "../src/device-compatibility.js";

describe("device compatibility and logical clocks", () => {
  it("accepts same versions fully, same-major older minors in degraded mode, and rejects incompatible majors", () => {
    expect(compareDeviceVersions("5.2.0", "5.2.0")).toMatchObject({
      compatible: true,
      mode: "full",
    });
    expect(compareDeviceVersions("5.2.0", "5.1.0")).toMatchObject({
      compatible: true,
      mode: "degraded",
    });
    expect(compareDeviceVersions("5.2.0", "1.0.0")).toMatchObject({
      compatible: false,
      mode: "incompatible",
    });
    expect(compareDeviceVersions("5.2.0", "6.0.0")).toMatchObject({
      compatible: false,
      mode: "incompatible",
    });
  });

  it("orders causal logical clocks by counter then globally unique device id, independent of wall time", () => {
    const first = new LogicalClock("device-a");
    const second = new LogicalClock("device-b");
    const a = first.tick();
    const b = second.tick();
    expect(LogicalClock.compare(a, b)).toBeLessThan(0);
    expect(first.observe({ counter: 10, device_id: "device-b" })).toMatchObject({
      counter: 11,
      device_id: "device-a",
    });
    expect(first.tick()).toMatchObject({ counter: 12, device_id: "device-a" });
  });
});
