import { afterEach, describe, expect, it } from "vitest";
import { ok } from "@nova/shared";
import type { MemoryStore } from "@nova/memory";
import { KnowledgeGraph } from "../src/knowledge-graph.js";
import { DevicePairingManager } from "../src/device-pairing.js";
import { Executor, PermissionManager, Planner, Verifier } from "../src/orchestration.js";
import { RuntimeApplication } from "../src/runtime-application.js";
import { TaskScheduler } from "../src/task-scheduler.js";
import { SessionContinuityManager } from "../src/session-continuity.js";

const configuration = {
  schema_version: "1.0.0" as const,
  capabilities: {},
  devices: [],
  channels: [],
  plugins: [],
  mcp_servers: [],
  routing_policies: {},
  permissions: {},
  voice: {
    enabled: false,
    wake_word: "nova",
    always_listening: false,
    barge_in_sensitivity: "conservative",
  },
  personalization: { preferences: [] },
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

  it("negotiates device capabilities through the composed runtime", () => {
    const continuity = new SessionContinuityManager({ now: () => 1000 });
    continuity.registerDevice("phone", [
      { capability_id: "camera", status: "Supported" },
      { capability_id: "microphone", status: "Permission denied" },
    ]);
    const application = new RuntimeApplication({
      configuration,
      planner: new Planner({ deterministic: new Map() }),
      executor: new Executor(
        new PermissionManager({ allowedToolIds: new Set(), confirmationTimeoutMs: 30_000 }),
        new Map(),
      ),
      verifier: new Verifier(),
      sessionContinuityManager: continuity,
    });
    applications.push(application);

    expect(application.negotiateDeviceCapability("phone", "camera")).toMatchObject({
      ok: true,
      value: { device_id: "phone", capability_id: "camera", status: "Supported" },
    });
    expect(application.negotiateDeviceCapability("phone", "microphone")).toMatchObject({
      ok: true,
      value: { status: "Permission denied" },
    });
  });

  it("exposes the trusted paired-device inventory through the composed runtime", async () => {
    const pairing = new DevicePairingManager({
      codeFactory: () => "PAIR",
      tokenFactory: () => "channel",
      verifySignature: () => true,
    });
    pairing.createOffer({ runtime_mode: "Companion", primary_public_key: "primary" });
    pairing.completePairing("PAIR", {
      device_id: "android-1",
      device_public_key: "public-key",
      challenge: "challenge",
      signature: "signature",
      runtime_mode: "Companion",
      confirmed: true,
    });
    const application = new RuntimeApplication({
      configuration,
      planner: new Planner({ deterministic: new Map() }),
      executor: new Executor(
        new PermissionManager({ allowedToolIds: new Set(), confirmationTimeoutMs: 30_000 }),
        new Map(),
      ),
      verifier: new Verifier(),
      devicePairingManager: pairing,
    });
    applications.push(application);

    expect(application.listTrustedDevices()).toEqual([
      {
        device_id: "android-1",
        device_public_key: "public-key",
        runtime_mode: "Companion",
        state: "Trusted",
        paired_at: expect.any(Number),
      },
    ]);
  });

  it("places tasks through the composed distributed coordinator and records the owning peer", async () => {
    const application = createApplication();
    applications.push(application);
    const created = application.tasks.create({
      task_id: "distributed-task",
      goal: "render report",
      owner_device_id: "laptop",
    });
    expect(created.ok).toBe(true);

    const placed = application.placeTask({
      task_id: "distributed-task",
      origin_device_id: "laptop",
      cross_peer_assignment_enabled: true,
      peers: [
        {
          device_id: "laptop",
          role: "full-peer",
          reachable: true,
          degraded: true,
          resource_headroom: 0.1,
          capabilities: [],
        },
        {
          device_id: "desktop",
          role: "full-peer",
          reachable: true,
          degraded: false,
          resource_headroom: 0.8,
          capabilities: [],
        },
      ],
    });

    expect(placed).toMatchObject({
      ok: true,
      value: {
        task: { owner_device_id: "desktop" },
        assignment: { device_id: "desktop", reassigned: true },
      },
    });
  });

  it("exposes the authenticated WebSocket URL from the same composed application", async () => {
    const application = createApplication();
    applications.push(application);
    await application.start();
    const token = application.issueToken(["task.read"]);

    expect(application.websocketUrl()).toMatch(/^ws:\/\/127\.0\.0\.1:\d+\/v1\/events$/);
    expect(token).toMatch(/^nova_/);
  });

  it("routes memory search, record lookup, and graph queries through the composed application", async () => {
    const memoryStore = {
      search: async () =>
        ok([
          {
            record_id: "memory-1",
            tier: "recent",
            content_ref: "note://deployment",
            confidence: 0.9,
            schema_version: "1.0.0",
            created_at: "2026-08-24T00:00:00.000Z",
            lineage: [],
          },
        ]),
      readRecord: async (recordId: string) =>
        ok({
          record_id: recordId,
          tier: "recent",
          content_ref: "note://deployment",
          confidence: 0.9,
          schema_version: "1.0.0",
          created_at: "2026-08-24T00:00:00.000Z",
          lineage: [],
        }),
    } as unknown as MemoryStore;
    const graph = new KnowledgeGraph();
    graph.addNode({
      id: "project-1",
      type: "Project",
      name: "Nova",
      properties: {},
      active: true,
    });
    graph.addNode({
      id: "file-1",
      type: "File",
      name: "README",
      properties: {},
      active: true,
    });
    graph.addEdge({
      id: "edge-1",
      type: "belongs_to",
      from_node_id: "file-1",
      to_node_id: "project-1",
      weight: 1,
    });
    const application = new RuntimeApplication({
      configuration,
      planner: new Planner({ deterministic: new Map() }),
      executor: new Executor(
        new PermissionManager({ allowedToolIds: new Set(), confirmationTimeoutMs: 30_000 }),
        new Map(),
      ),
      verifier: new Verifier(),
      memoryStore,
      knowledgeGraph: graph,
    });
    applications.push(application);
    await application.start();
    const token = application.issueToken(["memory.read"]);

    const search = await fetch(`${application.restUrl()}/v1/search`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ query: "deployment" }),
    });
    const record = await fetch(`${application.restUrl()}/v1/memory/memory-1`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const graphResponse = await fetch(`${application.restUrl()}/v1/graph/query`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ node_id: "file-1", direction: "out", depth: 1 }),
    });

    expect(search.status).toBe(200);
    expect(await search.json()).toMatchObject({ results: [{ record_id: "memory-1" }] });
    expect(record.status).toBe(200);
    expect(await record.json()).toMatchObject({ record_id: "memory-1" });
    expect(graphResponse.status).toBe(200);
    expect(await graphResponse.json()).toMatchObject({
      root: { id: "file-1" },
      nodes: [{ id: "project-1" }],
      edges: [{ id: "edge-1" }],
    });
  });
});
