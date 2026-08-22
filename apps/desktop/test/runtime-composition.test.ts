import { afterEach, describe, expect, it } from "vitest";
import { createDesktopRuntime } from "../src/main/runtime.js";

const runtimes: Array<ReturnType<typeof createDesktopRuntime>> = [];

afterEach(async () => {
  await Promise.all(runtimes.splice(0).map((runtime) => runtime.stop()));
});

describe("desktop runtime composition", () => {
  it("creates the shared local runtime application with real REST and WebSocket listeners", async () => {
    const runtime = createDesktopRuntime();
    runtimes.push(runtime);
    await runtime.start();

    expect(runtime.restUrl()).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);
    expect(runtime.websocketUrl()).toMatch(/^ws:\/\/127\.0\.0\.1:\d+\/v1\/events$/);
    expect(runtime.configuration.snapshot()).toMatchObject({ schema_version: "1.0.0" });
  });
});
