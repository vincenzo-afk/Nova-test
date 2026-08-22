import { resolve } from "node:path";
import { PrismaClient } from "../src/generated/index.js";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { TaskCheckpointStore } from "../src/task-checkpoint-store.js";

const databaseUrl = `file:${resolve("services/memory/prisma/test.db")}`;
const client = new PrismaClient({ datasources: { db: { url: databaseUrl } } });

const record = (state: "Created" | "Executing" | "Paused") => ({
  task_id: `task-${state.toLowerCase()}`,
  goal: "recover task",
  correlation_id: "corr-1",
  state,
  retry_count: 0,
  step_history: [],
  updated_at: new Date().toISOString(),
});

describe("TaskCheckpointStore", () => {
  beforeAll(async () => {
    await client.$connect();
  });

  beforeEach(async () => {
    await client.taskCheckpoint.deleteMany();
  });

  afterAll(async () => {
    await client.$disconnect();
  });

  it("persists immutable checkpoints and loads the latest state per task", async () => {
    const store = new TaskCheckpointStore(client, "workspace-1");
    await store.append(record("Created"), "Created");
    await store.append({ ...record("Created"), state: "Executing" }, "Valid");

    const latest = await store.loadLatest();

    expect(latest.ok).toBe(true);
    expect(latest.ok && latest.value).toHaveLength(1);
    expect(latest.ok && latest.value[0]).toMatchObject({
      task_id: "task-created",
      state: "Executing",
    });
    expect(await client.taskCheckpoint.count({ where: { workspaceId: "workspace-1" } })).toBe(2);
    expect(
      await client.taskCheckpoint.count({
        where: { workspaceId: "workspace-1", checkpointStatus: "Superseded" },
      }),
    ).toBe(1);
  });

  it("marks Executing and Verifying records Unverified while preserving Paused records", async () => {
    const store = new TaskCheckpointStore(client, "workspace-1");
    await store.append({ ...record("Executing"), task_id: "executing" }, "Valid");
    await store.append(
      { ...record("Executing"), task_id: "verifying", state: "Executing" },
      "Valid",
    );
    await store.append({ ...record("Paused"), task_id: "paused" }, "Valid");

    const recovered = await store.recoverAfterCrash();

    expect(recovered.ok).toBe(true);
    expect(recovered.ok && recovered.value).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ task_id: "executing", state: "Unverified" }),
        expect.objectContaining({ task_id: "verifying", state: "Unverified" }),
        expect.objectContaining({ task_id: "paused", state: "Paused" }),
      ]),
    );
    expect(
      await client.taskCheckpoint.count({
        where: { workspaceId: "workspace-1", checkpointStatus: "Valid" },
      }),
    ).toBe(3);
  });
});
