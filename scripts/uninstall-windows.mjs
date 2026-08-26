import { createInterface } from "node:readline/promises";
import { rm } from "node:fs/promises";
import process from "node:process";
import { join, resolve, win32 as windowsPath } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createWindowsServiceRemovalPlan,
  executeWindowsServiceRemovalPlan,
} from "./windows-service.mjs";

export function createWindowsUninstallPlan({
  platform,
  serviceName,
  userDataPath,
  dataDisposition,
  localAppDataPath,
}) {
  if (platform !== "win32") {
    throw new Error("Windows uninstall requires win32");
  }
  const servicePlan = createWindowsServiceRemovalPlan({ platform, serviceName });
  if (dataDisposition !== "retain" && dataDisposition !== "delete") {
    throw new Error("Data disposition is invalid");
  }
  const dataRoot = windowsPath.normalize(userDataPath);
  const expectedDataRoot =
    localAppDataPath === undefined
      ? undefined
      : windowsPath.join(windowsPath.normalize(localAppDataPath), "Nova");
  if (
    (expectedDataRoot === undefined && !isNovaLocalAppDataPath(dataRoot)) ||
    (expectedDataRoot !== undefined && dataRoot !== expectedDataRoot)
  ) {
    throw new Error("Windows user data path must end in AppData\\Local\\Nova");
  }
  return {
    serviceName: servicePlan.serviceName,
    serviceCommands: servicePlan.commands,
    userDataPath: dataRoot,
    dataDisposition,
  };
}

export async function executeWindowsUninstallPlan(
  plan,
  { confirmed, runCommand, removeData = removeDataFromDisk } = {},
) {
  if (confirmed !== true) {
    throw new Error("NOVA-SEC001: Windows uninstall requires explicit confirmation.");
  }
  await executeWindowsServiceRemovalPlan(
    { serviceName: plan.serviceName, commands: plan.serviceCommands },
    { confirmed: true, ...(runCommand === undefined ? {} : { runCommand }) },
  );
  if (plan.dataDisposition === "delete") await removeData(plan.userDataPath);
  return plan;
}

async function removeDataFromDisk(userDataPath) {
  await rm(userDataPath, { recursive: true, force: true });
}

function isNovaLocalAppDataPath(value) {
  const normalized = value.replace(/[\\/]+$/, "");
  return /^[A-Za-z]:\\Users\\[^\\]+\\AppData\\Local\\Nova$/i.test(normalized);
}

async function promptForDataDisposition() {
  const readline = createInterface({ input: process.stdin, output: process.stderr });
  try {
    const answer = (
      await readline.question("Retain Nova data or delete it? Type retain or delete: ")
    )
      .trim()
      .toLowerCase();
    return answer === "delete" ? "delete" : answer === "retain" ? "retain" : undefined;
  } finally {
    readline.close();
  }
}

async function promptForUninstallConfirmation(dataDisposition) {
  const readline = createInterface({ input: process.stdin, output: process.stderr });
  try {
    const answer = await readline.question(
      `Type UNINSTALL NOVA ${dataDisposition.toUpperCase()} to continue: `,
    );
    return answer === `UNINSTALL NOVA ${dataDisposition.toUpperCase()}`;
  } finally {
    readline.close();
  }
}

const isMain =
  process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) {
  if (process.platform !== "win32") {
    process.stderr.write("Nova uninstall must be run on Windows.\n");
    process.exitCode = 1;
  } else {
    const userDataPath = join(
      process.env.LOCALAPPDATA ??
        join(process.env.USERPROFILE ?? process.cwd(), "AppData", "Local"),
      "Nova",
    );
    promptForDataDisposition()
      .then((dataDisposition) => {
        if (dataDisposition === undefined) {
          throw new Error("Choose exactly retain or delete before uninstalling Nova.");
        }
        return createWindowsUninstallPlan({
          platform: process.platform,
          serviceName: process.env.NOVA_SERVICE_NAME ?? "NovaHost",
          userDataPath,
          dataDisposition,
          localAppDataPath:
            process.env.LOCALAPPDATA ??
            join(process.env.USERPROFILE ?? process.cwd(), "AppData", "Local"),
        });
      })
      .then(async (plan) => {
        const confirmed = await promptForUninstallConfirmation(plan.dataDisposition);
        return executeWindowsUninstallPlan(plan, { confirmed });
      })
      .then((plan) => process.stdout.write(`Nova uninstalled. Data: ${plan.dataDisposition}.\n`))
      .catch((error) => {
        process.stderr.write(`${error instanceof Error ? error.message : error}\n`);
        process.exitCode = 1;
      });
  }
}
