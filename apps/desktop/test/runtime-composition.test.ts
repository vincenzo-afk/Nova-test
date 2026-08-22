import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createDesktopRuntime } from "../src/main/runtime.js";

const runtimes: Array<Awaited<ReturnType<typeof createDesktopRuntime>>> = [];
const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(runtimes.splice(0).map((runtime) => runtime.stop()));
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true })),
  );
});

describe("desktop runtime composition", () => {
  it("creates the shared local runtime application with real REST and WebSocket listeners", async () => {
    const userDataPath = await mkdtemp(join(tmpdir(), "nova-desktop-composition-"));
    temporaryDirectories.push(userDataPath);
    const runtime = await createDesktopRuntime({ userDataPath });
    runtimes.push(runtime);
    await runtime.start();

    expect(runtime.restUrl()).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);
    expect(runtime.websocketUrl()).toMatch(/^ws:\/\/127\.0\.0\.1:\d+\/v1\/events$/);
    expect(runtime.configuration.snapshot()).toMatchObject({ schema_version: "1.0.0" });
    expect(runtime.permissions.list()).toEqual([
      { source: "filesystem", granted: false },
      { source: "applications", granted: false },
      { source: "windows", granted: false },
      { source: "browser", granted: false },
      { source: "clipboard", granted: false },
      { source: "notifications", granted: false },
    ]);
  });
});
