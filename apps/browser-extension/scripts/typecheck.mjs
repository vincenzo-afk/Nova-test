/* global URL, process */

import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const manifest = JSON.parse(await readFile(resolve(root, "manifest.json"), "utf8"));
if (
  manifest.manifest_version !== 3 ||
  !Array.isArray(manifest.permissions) ||
  manifest.permissions.length !== 1 ||
  manifest.permissions[0] !== "tabs"
) {
  throw new Error("Manifest must be Manifest V3 with only the tabs permission.");
}
if (manifest.host_permissions !== undefined || manifest.content_scripts !== undefined) {
  throw new Error("Manifest must not request host permissions or content scripts.");
}
const files = ["service-worker.js", "native-host/browser-native-host.mjs"];

for (const relativePath of files) {
  await new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, ["--check", resolve(root, relativePath)], {
      stdio: "inherit",
      shell: false,
    });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`Syntax check failed for ${relativePath}.`));
    });
  });
}
