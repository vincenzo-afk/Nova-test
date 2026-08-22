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

describe("desktop runtime persistence", () => {
  it("rejects startup when the host cannot locate its migration set", async () => {
    const userDataPath = await mkdtemp(join(tmpdir(), "nova-desktop-migration-failure-"));
    temporaryDirectories.push(userDataPath);

    await expect(
      createDesktopRuntime({
        userDataPath,
        migrationsPath: join(userDataPath, "missing-migrations"),
      }),
    ).rejects.toThrow("No Nova database migrations were found.");
  });

  it("persists a task in the per-user SQLite store and restores it after a runtime restart", async () => {
    const userDataPath = await mkdtemp(join(tmpdir(), "nova-desktop-persistence-"));
    temporaryDirectories.push(userDataPath);

    const first = await createDesktopRuntime({ userDataPath });
    runtimes.push(first);
    await first.start();
    const created = await first.coordinator.submitDurable({ goal: "persist across restart" });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    await first.stop();
    runtimes.splice(runtimes.indexOf(first), 1);

    const second = await createDesktopRuntime({ userDataPath });
    runtimes.push(second);
    await second.start();

    expect(second.tasks.get(created.value.task_id)).toMatchObject({
      ok: true,
      value: {
        task_id: created.value.task_id,
        goal: "persist across restart",
        state: "Created",
      },
    });
  });
});
