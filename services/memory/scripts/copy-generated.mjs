import { cp, rm } from "node:fs/promises";

await rm("dist/generated", { recursive: true, force: true });
await cp("src/generated", "dist/generated", { recursive: true });
