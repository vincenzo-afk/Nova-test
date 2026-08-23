import { mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import { join, resolve, win32 as windowsPath } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

export function createWindowsInstallPlan({ platform, repoRoot, userDataPath }) {
  if (platform !== "win32") {
    throw new Error("Windows installation requires win32");
  }
  const root = normalizePath(repoRoot, platform);
  const dataRoot = normalizePath(userDataPath, platform);
  const pathJoin = platform === "win32" ? windowsPath.join : join;
  return {
    repoRoot: root,
    userDataPath: dataRoot,
    directories: [pathJoin(dataRoot, "memory", "structured"), pathJoin(dataRoot, "models")],
    commands: [
      ["install", "--frozen-lockfile"],
      ["--filter", "@nova/desktop", "build"],
    ],
  };
}

function normalizePath(value, platform) {
  if (platform === "win32" && /^[A-Za-z]:[\\\\/]/.test(value)) {
    return windowsPath.normalize(value);
  }
  return resolve(value);
}

export async function executeWindowsInstallPlan(plan, { runCommand = runPnpm } = {}) {
  for (const directory of plan.directories) {
    await mkdir(directory, { recursive: true });
  }
  for (const args of plan.commands) {
    await runCommand(args, { cwd: plan.repoRoot });
  }
  return plan;
}

async function runPnpm(args, options) {
  const executable = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  await new Promise((resolvePromise, reject) => {
    const child = spawn(executable, args, { ...options, stdio: "inherit", shell: false });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolvePromise();
        return;
      }
      reject(
        new Error(`pnpm ${args.join(" ")} failed (${signal ?? `exit ${code ?? "unknown"}`}).`),
      );
    });
  });
}

const isMain =
  process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) {
  if (process.platform !== "win32") {
    process.stderr.write("Nova's Windows installer must be run on Windows.\n");
    process.exitCode = 1;
  } else {
    const userDataPath = join(
      process.env.LOCALAPPDATA ??
        join(process.env.USERPROFILE ?? process.cwd(), "AppData", "Local"),
      "Nova",
    );
    const plan = createWindowsInstallPlan({
      platform: process.platform,
      repoRoot: process.cwd(),
      userDataPath,
    });
    executeWindowsInstallPlan(plan)
      .then(() => {
        process.stdout.write(`Nova installed and built. User data: ${plan.userDataPath}\n`);
      })
      .catch((error) => {
        process.stderr.write(`${error instanceof Error ? error.message : error}\n`);
        process.exitCode = 1;
      });
  }
}
