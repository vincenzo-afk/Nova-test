import { access, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createWindowsInstallPlan,
  executeWindowsInstallPlan,
} from "../../../scripts/install-windows.mjs";

describe("createWindowsInstallPlan", () => {
  it("creates a non-destructive one-command bootstrap plan for Windows", () => {
    const plan = createWindowsInstallPlan({
      platform: "win32",
      repoRoot: "C:\\Users\\S K\\Desktop\\Nova-test",
      userDataPath: "C:\\Users\\S K\\AppData\\Local\\Nova",
    });

    expect(plan.commands).toEqual([
      ["install", "--frozen-lockfile"],
      ["--filter", "@nova/desktop", "build"],
    ]);
    expect(plan.userDataPath).toBe("C:\\Users\\S K\\AppData\\Local\\Nova");
    expect(plan.directories).toContain("C:\\Users\\S K\\AppData\\Local\\Nova\\memory\\structured");
    expect(plan.commands.flat().join(" ")).not.toMatch(
      /remove|uninstall|winget|curl|invoke-webrequest/i,
    );
    expect(plan.commands.flat().join(" ")).not.toMatch(/observer|filesystem|process/i);
  });

  it("does not pretend to be a Windows installer on other platforms", () => {
    expect(() =>
      createWindowsInstallPlan({
        platform: "linux",
        repoRoot: "/tmp/Nova-test",
        userDataPath: "/tmp/nova",
      }),
    ).toThrow("Windows installation requires win32");
  });
});

describe("executeWindowsInstallPlan", () => {
  it("creates only the user-scoped data directories before running bootstrap commands", async () => {
    const root = await mkdtemp(join(tmpdir(), "nova-installer-test-"));
    try {
      const plan = {
        repoRoot: root,
        userDataPath: join(root, "user-data"),
        directories: [
          join(root, "user-data", "memory", "structured"),
          join(root, "user-data", "models"),
        ],
        commands: [["install", "--frozen-lockfile"]],
      };
      const calls = [];

      await executeWindowsInstallPlan(plan, {
        runCommand: async (args, options) => {
          calls.push({ args, options });
        },
      });

      await access(plan.directories[0]);
      await access(plan.directories[1]);
      expect(calls).toEqual([{ args: ["install", "--frozen-lockfile"], options: { cwd: root } }]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("propagates a failed bootstrap command and does not run later commands", async () => {
    const root = await mkdtemp(join(tmpdir(), "nova-installer-failure-"));
    try {
      const plan = {
        repoRoot: root,
        userDataPath: join(root, "user-data"),
        directories: [join(root, "user-data")],
        commands: [["install"], ["--filter", "@nova/desktop", "build"]],
      };
      const calls = [];

      await expect(
        executeWindowsInstallPlan(plan, {
          runCommand: async (args) => {
            calls.push(args);
            throw new Error("dependency installation failed");
          },
        }),
      ).rejects.toThrow("dependency installation failed");
      expect(calls).toEqual([["install"]]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
