import { describe, expect, it, vi } from "vitest";
import {
  createWindowsNativeHostRegistrationPlan,
  executeWindowsNativeHostRegistrationPlan,
} from "../../../scripts/windows-browser-native-host.mjs";

describe("Windows browser Native Messaging registration", () => {
  it("materializes a placeholder-free manifest and HKCU registry command", () => {
    const plan = createWindowsNativeHostRegistrationPlan({
      platform: "win32",
      extensionId: "abcdefghijklmnopabcdefghijklmnop",
      hostExecutablePath: "C:\\Program Files\\Nova\\browser-native-host.exe",
      manifestDirectory: "C:\\Users\\Alice\\AppData\\Local\\Nova\\native-host",
    });

    expect(plan.manifest).toEqual({
      name: "com.nova.browser",
      description: "NOVA local browser metadata bridge",
      type: "stdio",
      path: "C:\\Program Files\\Nova\\browser-native-host.exe",
      allowed_origins: ["chrome-extension://abcdefghijklmnopabcdefghijklmnop/"],
    });
    expect(plan.manifestPath).toBe(
      "C:\\Users\\Alice\\AppData\\Local\\Nova\\native-host\\com.nova.browser.json",
    );
    expect(plan.registryCommand).toEqual([
      "ADD",
      "HKCU\\Software\\Google\\Chrome\\NativeMessagingHosts\\com.nova.browser",
      "/ve",
      "/t",
      "REG_SZ",
      "/d",
      "C:\\Users\\Alice\\AppData\\Local\\Nova\\native-host\\com.nova.browser.json",
      "/f",
    ]);
    expect(JSON.stringify(plan)).not.toContain("__NOVA_");
  });

  it("rejects non-Windows hosts, malformed IDs, and non-absolute paths", () => {
    expect(() =>
      createWindowsNativeHostRegistrationPlan({
        platform: "linux",
        extensionId: "abcdefghijklmnopabcdefghijklmnop",
        hostExecutablePath: "C:\\Nova\\host.exe",
        manifestDirectory: "C:\\Nova",
      }),
    ).toThrow(/requires win32/);
    expect(() =>
      createWindowsNativeHostRegistrationPlan({
        platform: "win32",
        extensionId: "not-an-extension-id",
        hostExecutablePath: "C:\\Nova\\host.exe",
        manifestDirectory: "C:\\Nova",
      }),
    ).toThrow(/extension ID is invalid/);
    expect(() =>
      createWindowsNativeHostRegistrationPlan({
        platform: "win32",
        extensionId: "abcdefghijklmnopabcdefghijklmnop",
        hostExecutablePath: "relative\\host.exe",
        manifestDirectory: "C:\\Nova",
      }),
    ).toThrow(/absolute Windows host executable path/);
  });

  it("writes the manifest before registering it and stops on failure", async () => {
    const plan = createWindowsNativeHostRegistrationPlan({
      platform: "win32",
      extensionId: "abcdefghijklmnopabcdefghijklmnop",
      hostExecutablePath: "C:\\Nova\\host.exe",
      manifestDirectory: "C:\\Nova\\native-host",
    });
    const writeManifest = vi.fn(async () => undefined);
    const runCommand = vi.fn(async () => undefined);

    await executeWindowsNativeHostRegistrationPlan(plan, { writeManifest, runCommand });

    expect(writeManifest).toHaveBeenCalledWith(
      plan.manifestPath,
      `${JSON.stringify(plan.manifest, null, 2)}\n`,
    );
    expect(runCommand).toHaveBeenCalledWith(plan.registryCommand, { cwd: process.cwd() });

    const failingRunCommand = vi.fn(async () => {
      throw new Error("registry write failed");
    });
    await expect(
      executeWindowsNativeHostRegistrationPlan(plan, {
        writeManifest,
        runCommand: failingRunCommand,
      }),
    ).rejects.toThrow("registry write failed");
    expect(failingRunCommand).toHaveBeenCalledTimes(1);
  });
});
