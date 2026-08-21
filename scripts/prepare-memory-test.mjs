import process from "node:process";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const environment = {
  ...process.env,
  DATABASE_URL: "file:./test.db",
};

const run = (argumentsList) => {
  execFileSync("pnpm", argumentsList, {
    cwd: repositoryRoot,
    env: environment,
    stdio: "inherit",
  });
};

run(["--filter", "@nova/memory", "prisma:generate"]);
run([
  "--filter",
  "@nova/memory",
  "exec",
  "prisma",
  "migrate",
  "deploy",
  "--schema",
  "prisma/schema.prisma",
]);
