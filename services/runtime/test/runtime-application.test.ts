import { afterEach, describe, expect, it } from "vitest";
import { ok } from "@nova/shared";
import { Executor, PermissionManager, Planner, Verifier } from "../src/orchestration.js";
import { RuntimeApplication } from "../src/runtime-application.js";
import { TaskScheduler } from "../src/task-scheduler.js";

const configuration = {
  schema_version: "1.0.0" as const,
  capabilities: {},
  devices: [],
  channels: [],
  plugins: [],
  mcp_servers: [],
  routing_policies: {},
  permissions: {},
  voice: {},
  personalization: {},
};

const applications: RuntimeApplication[] = [];

const createApplication = (): RuntimeApplication =>
  new RuntimeApplication({
    configuration,
    planner: new Planner({ deterministic: new Map() }),
    executor: new Executor(
      new PermissionManager({ allowedToolIds: new Set(), confirmationTimeoutMs: 30_000 }),
      new Map(),
    ),
    verifier: new Verifier(),
  });

afterEach(async () => {
  await Promise.all(applications.splice(0).map((application) => application.stop()));
});

describe("RuntimeApplication", () => {
  it("composes the real REST task lifecycle and configuration handlers", async () => {
    const application = createApplication();
    applications.push(application);
    await application.start();
    const taskToken = application.issueToken(["task.submit", "task.read"]);
    const configToken = application.issueToken(["config.read", "config.write"]);

    const submitted = await fetch(`${application.restUrl()}/v1/tasks`, {
      method: "POST",
      headers: { Authorization: `Bearer ${taskToken}`, "content-type": "application/json" },
      body: JSON.stringify({ goal: "not configured", priority: "interactive" }),
    });
    const task = (await submitted.json()) as { task_id: string; state: string };
    const listed = await fetch(`${application.restUrl()}/v1/tasks`, {
      headers: { Authorization: `Bearer ${taskToken}` },
    });
    const config = await fetch(`${application.restUrl()}/v1/config`, {
      headers: { Authorization: `Bearer ${configToken}` },
    });

    expect(submitted.status).toBe(202);
    expect(task).toMatchObject({ task_id: expect.any(String), state: "Created" });
    expect(listed.status).toBe(200);
    expect(await listed.json()).toMatchObject({ items: [task] });
    expect(config.status).toBe(200);
    expect(await config.json()).toEqual(configuration);
  });

  it("dispatches submitted REST tasks through the injected local scheduler", async () => {
    const started: string[] = [];
    const scheduler = new TaskScheduler(
      {
        execute: async (taskId) => {
          started.push(taskId);
          return ok(undefined);
        },
      },
      { maxConcurrent: 1, starvationThresholdMs: 60_000 },
    );
    const application = new RuntimeApplication({
      configuration,
      planner: new Planner({ deterministic: new Map() }),
      executor: new Executor(
        new PermissionManager({ allowedToolIds: new Set(), confirmationTimeoutMs: 30_000 }),
        new Map(),
      ),
      verifier: new Verifier(),
      scheduler,
    });
    applications.push(application);
    await application.start();
    const token = application.issueToken(["task.submit", "task.read"]);

    const submitted = await fetch(`${application.restUrl()}/v1/tasks`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ goal: "schedule me", priority: "background" }),
    });
    const task = (await submitted.json()) as { task_id: string };
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(submitted.status).toBe(202);
    expect(started).toEqual([task.task_id]);
    expect(scheduler.activeCount()).toBe(0);
  });

  it("recovers persisted in-flight tasks before starting its listeners and durably acknowledges submission", async () => {
    const appended: string[] = [];
    const persistence = {
      recoverAfterCrash: async () =>
        ok([
          {
            task_id: "recover-me",
            goal: "recover",
            correlation_id: "corr-recover",
            state: "Executing" as const,
            retry_count: 0,
            step_history: [],
            updated_at: new Date().toISOString(),
          },
        ]),
      append: async (record: { task_id: string }) => {
        appended.push(record.task_id);
        return ok(undefined);
      },
    };
    const application = new RuntimeApplication({
      configuration,
      planner: new Planner({ deterministic: new Map() }),
      executor: new Executor(
        new PermissionManager({ allowedToolIds: new Set(), confirmationTimeoutMs: 30_000 }),
        new Map(),
      ),
      verifier: new Verifier(),
      persistence,
    });
    applications.push(application);
    await application.start();
    const token = application.issueToken(["task.submit", "task.read"]);

    expect(application.tasks.get("recover-me")).toMatchObject({
      ok: true,
      value: { state: "Unverified" },
    });
    const submitted = await fetch(`${application.restUrl()}/v1/tasks`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ goal: "persist me", priority: "interactive" }),
    });

    expect(submitted.status).toBe(202);
    expect(appended).toEqual([expect.any(String)]);
  });

  it("exposes the authenticated WebSocket URL from the same composed application", async () => {
    const application = createApplication();
    applications.push(application);
    await application.start();
    const token = application.issueToken(["task.read"]);

    expect(application.websocketUrl()).toMatch(/^ws:\/\/127\.0\.0\.1:\d+\/v1\/events$/);
    expect(token).toMatch(/^nova_/);
  });
});
