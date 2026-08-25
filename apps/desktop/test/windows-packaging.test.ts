import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const desktopRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

describe("Windows packaging configuration", () => {
  it("defines a non-per-machine NSIS package for the real Electron main entry", async () => {
    const text = await readFile(resolve(desktopRoot, "electron-builder.json"), "utf8");
    const config = JSON.parse(text) as {
      appId?: string;
      productName?: string;
      files?: string[];
      directories?: { output?: string };
      nsis?: { oneClick?: boolean; perMachine?: boolean };
      extraResources?: Array<{ from?: string; to?: string }>;
      extraMetadata?: { main?: string };
    };

    expect(config).toMatchObject({
      appId: "com.nova.desktop",
      productName: "NOVA",
      extraMetadata: { main: "dist/main/main.js" },
      directories: { output: "../../release" },
      nsis: { oneClick: false, perMachine: false },
    });
    expect(config.files).toEqual(expect.arrayContaining(["dist/**/*"]));
    expect(config.extraResources).toEqual(
      expect.arrayContaining([{ from: "dist/migrations", to: "migrations" }]),
    );
  });
});
