import { cp, rm } from "node:fs/promises";

await rm("dist/migrations", { recursive: true, force: true });
await cp("../../services/memory/prisma/migrations", "dist/migrations", { recursive: true });
