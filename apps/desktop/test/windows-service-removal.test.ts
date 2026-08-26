import { describe, expect, it, vi } from "vitest";
import {
  createWindowsServiceRemovalPlan,
  executeWindowsServiceRemovalPlan,
} from "../../../scripts/windows-service.mjs";

describe("Windows service removal", () => {
  it("creates a scoped delete plan without data-removal commands", () => {
    const plan = createWindowsServiceRemovalPlan({
      platform: "win32",
      serviceName: "NovaHost",
    });

    expect(plan).toEqual({
      serviceName: "NovaHost",
      commands: [["delete", "NovaHost"]],
    });
    expect(JSON.stringify(plan)).not.toMatch(/uninstall|remove|delete.*data|memory|database/i);
  });

  it("rejects non-Windows hosts and invalid service names", () => {
    expect(() =>
      createWindowsServiceRemovalPlan({ platform: "linux", serviceName: "NovaHost" }),
    ).toThrow("Windows service removal requires win32");
    expect(() =>
      createWindowsServiceRemovalPlan({ platform: "win32", serviceName: "Nova Host" }),
    ).toThrow("Windows service name is invalid");
  });

  it("requires explicit confirmation before invoking the service manager", async () => {
    const plan = createWindowsServiceRemovalPlan({
      platform: "win32",
      serviceName: "NovaHost",
    });
    const runCommand = vi.fn(async () => undefined);

    await expect(
      executeWindowsServiceRemovalPlan(plan, { confirmed: false, runCommand }),
    ).rejects.toThrow("NOVA-SEC001");
    expect(runCommand).not.toHaveBeenCalled();

    await executeWindowsServiceRemovalPlan(plan, { confirmed: true, runCommand });
    expect(runCommand).toHaveBeenCalledWith(["delete", "NovaHost"], {
      cwd: process.cwd(),
    });
  });
});
