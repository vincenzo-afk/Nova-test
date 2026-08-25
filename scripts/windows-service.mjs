import { spawn } from "node:child_process";
import { createInterface } from "node:readline/promises";
import process from "node:process";
import { resolve, win32 as windowsPath } from "node:path";
import { fileURLToPath } from "node:url";

const SERVICE_DESCRIPTION = "NOVA background host runtime";
const SERVICE_RECOVERY = [
  "failure",
  "__SERVICE_NAME__",
  "reset=",
  "86400",
  "actions=",
  "restart/5000/restart/30000/restart/60000",
];

export function createWindowsServiceRegistrationPlan({
  platform,
  serviceName,
  hostExecutablePath,
  hostArguments = [],
  serviceAccount,
}) {
  if (platform !== "win32") {
    throw new Error("Windows service registration requires win32");
  }
  if (!/^[A-Za-z0-9_.-]{1,128}$/.test(serviceName)) {
    throw new Error("Windows service name is invalid");
  }
  if (!isAbsoluteWindowsPath(hostExecutablePath)) {
    throw new Error("Windows service requires an absolute Windows host executable path");
  }
  if (typeof serviceAccount !== "string" || serviceAccount.trim() === "") {
    throw new Error("Windows service account is required");
  }
  if (hostArguments.some((argument) => typeof argument !== "string")) {
    throw new Error("Windows service host arguments must be strings");
  }

  const binPath = [
    quoteWindowsArgument(windowsPath.normalize(hostExecutablePath)),
    ...hostArguments.map(quoteWindowsArgument),
  ].join(" ");
  return {
    serviceName,
    serviceAccount,
    commands: [
      ["create", serviceName, "binPath=", binPath, "start=", "auto", "obj=", serviceAccount],
      ["description", serviceName, SERVICE_DESCRIPTION],
      SERVICE_RECOVERY.map((argument) =>
        argument === "__SERVICE_NAME__" ? serviceName : argument,
      ),
    ],
  };
}

export async function executeWindowsServiceRegistrationPlan(
  plan,
  { runCommand = runSc, resolvePassword = promptForPassword } = {},
) {
  const password = await resolvePassword(plan.serviceAccount);
  if (typeof password !== "string") {
    throw new Error("Windows service password resolver must return a string");
  }
  for (const [index, command] of plan.commands.entries()) {
    const args = index === 0 ? [...command, "password=", password] : [...command];
    await runCommand(args, { cwd: process.cwd() });
  }
  return plan;
}

async function promptForPassword(serviceAccount) {
  const readline = createInterface({ input: process.stdin, output: process.stderr });
  try {
    return await readline.question(`Password for Windows service account ${serviceAccount}: `);
  } finally {
    readline.close();
  }
}

function isAbsoluteWindowsPath(value) {
  return typeof value === "string" && windowsPath.isAbsolute(value);
}

function quoteWindowsArgument(value) {
  if (/^[A-Za-z0-9_./:=+\\-]+$/.test(value)) return value;
  return `"${value.replace(/"/g, '\\"')}"`;
}

const isMain =
  process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) {
  if (process.platform !== "win32") {
    process.stderr.write("Windows service registration must be run on Windows.\n");
    process.exitCode = 1;
  } else {
    const hostExecutablePath = process.env.NOVA_HOST_EXECUTABLE;
    const serviceAccount = process.env.NOVA_SERVICE_ACCOUNT;
    if (!hostExecutablePath || !serviceAccount) {
      process.stderr.write(
        "Set NOVA_HOST_EXECUTABLE and NOVA_SERVICE_ACCOUNT before registering the service.\n",
      );
      process.exitCode = 1;
    } else {
      const plan = createWindowsServiceRegistrationPlan({
        platform: process.platform,
        serviceName: process.env.NOVA_SERVICE_NAME ?? "NovaHost",
        hostExecutablePath,
        serviceAccount,
      });
      executeWindowsServiceRegistrationPlan(plan)
        .then(() =>
          process.stdout.write(`Registered ${plan.serviceName} for ${plan.serviceAccount}.\n`),
        )
        .catch((error) => {
          process.stderr.write(`${error instanceof Error ? error.message : error}\n`);
          process.exitCode = 1;
        });
    }
  }
}

async function runSc(args, options) {
  if (process.platform !== "win32") {
    throw new Error("Windows service registration requires win32");
  }
  await new Promise((resolvePromise, reject) => {
    const child = spawn("sc.exe", args, { ...options, stdio: "inherit", shell: false });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolvePromise();
        return;
      }
      reject(
        new Error(`sc.exe ${args.join(" ")} failed (${signal ?? `exit ${code ?? "unknown"}`}).`),
      );
    });
  });
}
