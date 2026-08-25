import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import process from "node:process";
import { resolve, win32 as windowsPath } from "node:path";
import { fileURLToPath } from "node:url";

const HOST_NAME = "com.nova.browser";
const HOST_DESCRIPTION = "NOVA local browser metadata bridge";
const EXTENSION_ID_PATTERN = /^[a-p]{32}$/;

export function createWindowsNativeHostRegistrationPlan({
  platform,
  extensionId,
  hostExecutablePath,
  manifestDirectory,
}) {
  if (platform !== "win32") {
    throw new Error("Windows Native Messaging registration requires win32");
  }
  if (!EXTENSION_ID_PATTERN.test(extensionId)) {
    throw new Error("Chrome extension ID is invalid");
  }
  if (!isAbsoluteWindowsPath(hostExecutablePath)) {
    throw new Error("Native Messaging host requires an absolute Windows host executable path");
  }
  if (!isAbsoluteWindowsPath(manifestDirectory)) {
    throw new Error("Native Messaging manifest requires an absolute Windows manifest directory");
  }

  const normalizedManifestDirectory = windowsPath.normalize(manifestDirectory);
  const manifestPath = windowsPath.join(normalizedManifestDirectory, `${HOST_NAME}.json`);
  const manifest = {
    name: HOST_NAME,
    description: HOST_DESCRIPTION,
    type: "stdio",
    path: windowsPath.normalize(hostExecutablePath),
    allowed_origins: [`chrome-extension://${extensionId}/`],
  };

  return {
    platform,
    manifest,
    manifestPath,
    registryCommand: [
      "ADD",
      `HKCU\\Software\\Google\\Chrome\\NativeMessagingHosts\\${HOST_NAME}`,
      "/ve",
      "/t",
      "REG_SZ",
      "/d",
      manifestPath,
      "/f",
    ],
  };
}

export async function executeWindowsNativeHostRegistrationPlan(
  plan,
  { writeManifest: writeManifestFile = writeManifestToDisk, runCommand = runReg } = {},
) {
  if (plan.platform !== "win32") {
    throw new Error("Windows Native Messaging registration requires win32");
  }
  await writeManifestFile(plan.manifestPath, `${JSON.stringify(plan.manifest, null, 2)}\n`);
  await runCommand(plan.registryCommand, { cwd: process.cwd() });
  return plan;
}

async function writeManifestToDisk(manifestPath, contents) {
  await mkdir(windowsPath.dirname(manifestPath), { recursive: true });
  await writeFile(manifestPath, contents, "utf8");
}

function isAbsoluteWindowsPath(value) {
  return typeof value === "string" && windowsPath.isAbsolute(value);
}

const isMain =
  process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) {
  if (process.platform !== "win32") {
    process.stderr.write("Windows Native Messaging registration must be run on Windows.\n");
    process.exitCode = 1;
  } else {
    const extensionId = process.env.NOVA_BROWSER_EXTENSION_ID;
    const hostExecutablePath = process.env.NOVA_NATIVE_HOST_EXECUTABLE;
    const manifestDirectory = process.env.NOVA_NATIVE_HOST_MANIFEST_DIR;
    if (!extensionId || !hostExecutablePath || !manifestDirectory) {
      process.stderr.write(
        "Set NOVA_BROWSER_EXTENSION_ID, NOVA_NATIVE_HOST_EXECUTABLE, and NOVA_NATIVE_HOST_MANIFEST_DIR before registering the browser host.\n",
      );
      process.exitCode = 1;
    } else {
      const plan = createWindowsNativeHostRegistrationPlan({
        platform: process.platform,
        extensionId,
        hostExecutablePath,
        manifestDirectory,
      });
      executeWindowsNativeHostRegistrationPlan(plan)
        .then(() => process.stdout.write(`Registered ${HOST_NAME} for Chrome.\n`))
        .catch((error) => {
          process.stderr.write(`${error instanceof Error ? error.message : error}\n`);
          process.exitCode = 1;
        });
    }
  }
}

async function runReg(args, options) {
  if (process.platform !== "win32") {
    throw new Error("Windows Native Messaging registration requires win32");
  }
  await new Promise((resolvePromise, reject) => {
    const child = spawn("reg.exe", args, { ...options, stdio: "inherit", shell: false });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolvePromise();
        return;
      }
      reject(
        new Error(`reg.exe ${args.join(" ")} failed (${signal ?? `exit ${code ?? "unknown"}`}).`),
      );
    });
  });
}
