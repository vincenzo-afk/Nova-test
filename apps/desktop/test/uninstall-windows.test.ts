import { describe, expect, it, vi } from "vitest";
import {
  createWindowsUninstallPlan,
  executeWindowsUninstallPlan,
} from "../../../scripts/uninstall-windows.mjs";

describe("Windows uninstall", () => {
  it("creates a service-removal plan with explicit data retention", () => {
    const plan = createWindowsUninstallPlan({
      platform: "win32",
      serviceName: "NovaHost",
      userDataPath: "C:\\Users\\Alice\\AppData\\Local\\Nova",
      dataDisposition: "retain",
    });

    expect(plan).toEqual({
      serviceName: "NovaHost",
      serviceCommands: [["delete", "NovaHost"]],
      userDataPath: "C:\\Users\\Alice\\AppData\\Local\\Nova",
      dataDisposition: "retain",
    });
  });

  it("accepts a redirected local application-data root only when it matches explicitly", () => {
    const plan = createWindowsUninstallPlan({
      platform: "win32",
      serviceName: "NovaHost",
      userDataPath: "D:\\NovaProfile\\Nova",
      localAppDataPath: "D:\\NovaProfile",
      dataDisposition: "retain",
    });

    expect(plan.userDataPath).toBe("D:\\NovaProfile\\Nova");
    expect(() =>
      createWindowsUninstallPlan({
        platform: "win32",
        serviceName: "NovaHost",
        userDataPath: "D:\\OtherProfile\\Nova",
        localAppDataPath: "D:\\NovaProfile",
        dataDisposition: "delete",
      }),
    ).toThrow("Windows user data path must end in AppData\\Local\\Nova");
  });

  it("rejects non-Windows hosts, invalid data choices, and unsafe data roots", () => {
    expect(() =>
      createWindowsUninstallPlan({
        platform: "linux",
        serviceName: "NovaHost",
        userDataPath: "C:\\Users\\Alice\\AppData\\Local\\Nova",
        dataDisposition: "retain",
      }),
    ).toThrow("Windows uninstall requires win32");
    expect(() =>
      createWindowsUninstallPlan({
        platform: "win32",
        serviceName: "NovaHost",
        userDataPath: "C:\\Users\\Alice\\AppData\\Local\\Nova",
        dataDisposition: "unknown" as never,
      }),
    ).toThrow("Data disposition is invalid");
    expect(() =>
      createWindowsUninstallPlan({
        platform: "win32",
        serviceName: "NovaHost",
        userDataPath: "C:\\Users\\Alice\\AppData\\Local",
        dataDisposition: "delete",
      }),
    ).toThrow("Windows user data path must end in AppData\\Local\\Nova");
  });

  it("requires confirmation and never deletes retained data", async () => {
    const plan = createWindowsUninstallPlan({
      platform: "win32",
      serviceName: "NovaHost",
      userDataPath: "C:\\Users\\Alice\\AppData\\Local\\Nova",
      dataDisposition: "retain",
    });
    const runCommand = vi.fn(async () => undefined);
    const removeData = vi.fn(async () => undefined);

    await expect(
      executeWindowsUninstallPlan(plan, { confirmed: false, runCommand, removeData }),
    ).rejects.toThrow("NOVA-SEC001");
    expect(runCommand).not.toHaveBeenCalled();
    expect(removeData).not.toHaveBeenCalled();

    await executeWindowsUninstallPlan(plan, { confirmed: true, runCommand, removeData });
    expect(runCommand).toHaveBeenCalledWith(["delete", "NovaHost"], {
      cwd: process.cwd(),
    });
    expect(removeData).not.toHaveBeenCalled();
  });

  it("deletes data only after confirmed service removal when requested", async () => {
    const plan = createWindowsUninstallPlan({
      platform: "win32",
      serviceName: "NovaHost",
      userDataPath: "C:\\Users\\Alice\\AppData\\Local\\Nova",
      dataDisposition: "delete",
    });
    const calls: string[] = [];
    const runCommand = vi.fn(async () => {
      calls.push("service");
    });
    const removeData = vi.fn(async () => {
      calls.push("data");
    });

    await executeWindowsUninstallPlan(plan, { confirmed: true, runCommand, removeData });

    expect(calls).toEqual(["service", "data"]);
    expect(removeData).toHaveBeenCalledWith(plan.userDataPath);
  });
});
