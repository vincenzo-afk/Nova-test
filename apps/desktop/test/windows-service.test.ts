import { describe, expect, it, vi } from "vitest";
import {
  createWindowsServiceRegistrationPlan,
  executeWindowsServiceRegistrationPlan,
} from "../../../scripts/windows-service.mjs";

describe("Windows service registration", () => {
  it("creates a user-scoped auto-start host service plan without embedding credentials", () => {
    const plan = createWindowsServiceRegistrationPlan({
      platform: "win32",
      serviceName: "NovaHost",
      hostExecutablePath: "C:\\Program Files\\Nova\\Nova.exe",
      hostArguments: ["--host"],
      serviceAccount: ".\\alice",
    });

    expect(plan.commands).toEqual([
      [
        "create",
        "NovaHost",
        "binPath=",
        '"C:\\Program Files\\Nova\\Nova.exe" --host',
        "start=",
        "auto",
        "obj=",
        ".\\alice",
      ],
      ["description", "NovaHost", "NOVA background host runtime"],
      [
        "failure",
        "NovaHost",
        "reset=",
        "86400",
        "actions=",
        "restart/5000/restart/30000/restart/60000",
      ],
    ]);
    expect(JSON.stringify(plan)).not.toContain("password");
  });

  it("rejects non-Windows registration and invalid paths", () => {
    expect(() =>
      createWindowsServiceRegistrationPlan({
        platform: "linux",
        serviceName: "NovaHost",
        hostExecutablePath: "/opt/nova/Nova.exe",
        serviceAccount: ".\\alice",
      }),
    ).toThrow("Windows service registration requires win32");
    expect(() =>
      createWindowsServiceRegistrationPlan({
        platform: "win32",
        serviceName: "NovaHost",
        hostExecutablePath: "Nova.exe",
        serviceAccount: ".\\alice",
      }),
    ).toThrow("absolute Windows host executable path");
  });

  it("executes commands in order and stops after a failed command", async () => {
    const plan = createWindowsServiceRegistrationPlan({
      platform: "win32",
      serviceName: "NovaHost",
      hostExecutablePath: "C:\\Nova\\Nova.exe",
      serviceAccount: ".\\alice",
    });
    const runCommand = vi.fn(async (args: readonly string[]) => {
      if (args[0] === "description") throw new Error("service manager failed");
    });

    await expect(
      executeWindowsServiceRegistrationPlan(plan, {
        runCommand,
        resolvePassword: async () => "secret",
      }),
    ).rejects.toThrow("service manager failed");
    expect(runCommand).toHaveBeenCalledTimes(2);
    expect(runCommand).toHaveBeenNthCalledWith(
      1,
      expect.arrayContaining(["password=", "secret"]),
      expect.objectContaining({ cwd: expect.any(String) }),
    );
  });
});
