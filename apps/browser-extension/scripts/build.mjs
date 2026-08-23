/* global process */

import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(root, "dist");

await rm(output, { recursive: true, force: true });
await mkdir(resolve(output, "native-host"), { recursive: true });
await cp(resolve(root, "manifest.json"), resolve(output, "manifest.json"));
await cp(resolve(root, "service-worker.js"), resolve(output, "service-worker.js"));
await cp(
  resolve(root, "native-host", "com.nova.browser.json"),
  resolve(output, "native-host", "com.nova.browser.json"),
);
await cp(
  resolve(root, "native-host", "browser-native-host.mjs"),
  resolve(output, "native-host", "browser-native-host.mjs"),
);

process.stdout.write(`Browser extension artifacts written to ${output}.\n`);
