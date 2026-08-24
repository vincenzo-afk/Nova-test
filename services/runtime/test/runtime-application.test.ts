import { afterEach, describe, expect, it } from "vitest";
import { ok } from "@nova/shared";
import type { MemoryStore } from "@nova/memory";
import { KnowledgeGraph } from "../src/knowledge-graph.js";
import { AndroidCompanionManager, type CompanionCapability } from "../src/android-companion.js";
import { RemoteControlManager } from "../src/remote-control.js";
import { EmailAssistant, type EmailDraft } from "../src/email-assistant.js";
import { CalendarAssistant, type CalendarDraft } from "../src/calendar-assistant.js";
import { ChannelManager, type ChannelAdapter } from "../src/channel-adapter.js";
import { BackgroundAssistant } from "../src/background-assistant.js";
import { AdaptivePersonalization } from "../src/adaptive-personalization.js";
import { ConfigurationStore } from "../src/configuration-store.js";
import { PersonalAnalytics, type AnalyticsInput } from "../src/personal-analytics.js";
import { IncidentManager, type IncidentSeverity } from "../src/incident-lifecycle.js";
import { DevicePairingManager } from "../src/device-pairing.js";
import { CrossDeviceSyncManager } from "../src/cross-device-sync.js";
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
  it("delegates explicit Android companion permissions and capability checks", () => {
    const companion = new AndroidCompanionManager("android-1", ["camera"]);
    const capability: CompanionCapability = {
      capability_id: "camera.capture",
      required_permissions: ["camera"],
    };
    const application = new RuntimeApplication({
      configuration,
      planner: new Planner({ deterministic: new Map() }),
      executor: new Executor(
        new PermissionManager({ allowedToolIds: new Set(), confirmationTimeoutMs: 30_000 }),
        new Map(),
      ),
      verifier: new Verifier(),
      androidCompanionManager: companion,
    });
    applications.push(application);

    expect(application.checkAndroidCompanionCapability(capability)).toMatchObject({
      ok: false,
      error: { code: "NOVA-SEC001" },
    });
    expect(application.setAndroidCompanionPermission("camera", true)).toMatchObject({ ok: true });
    expect(application.checkAndroidCompanionCapability(capability)).toMatchObject({
      ok: true,
      value: { status: "Available", device_id: "android-1" },
    });
    expect(application.setAndroidCompanionPermission("camera", false)).toMatchObject({ ok: true });
  });

  it("controls the Android companion foreground service before background use", () => {
    const companion = new AndroidCompanionManager("android-1", ["notifications"]);
    const application = new RuntimeApplication({
      configuration,
      planner: new Planner({ deterministic: new Map() }),
      executor: new Executor(
        new PermissionManager({ allowedToolIds: new Set(), confirmationTimeoutMs: 30_000 }),
        new Map(),
      ),
      verifier: new Verifier(),
      androidCompanionManager: companion,
    });
    applications.push(application);

    expect(application.startAndroidCompanionBackground("notifications")).toMatchObject({
      ok: false,
      error: { code: "NOVA-SEC001" },
    });
    expect(application.startAndroidCompanionForegroundService()).toMatchObject({ ok: true });
    expect(application.startAndroidCompanionBackground("notifications")).toMatchObject({
      ok: true,
    });
    expect(application.stopAndroidCompanionForegroundService()).toMatchObject({ ok: true });
    expect(application.startAndroidCompanionBackground("notifications")).toMatchObject({
      ok: false,
      error: { code: "NOVA-SEC001" },
    });
  });

  it("routes email reads, drafts, and confirmed sends through the composed runtime", async () => {
    const email = new EmailAssistant({
      read: async () => [],
      send: async (draft) => ({ ...draft, message_id: "sent-1" }),
    });
    const application = new RuntimeApplication({
      configuration,
      planner: new Planner({ deterministic: new Map() }),
      executor: new Executor(
        new PermissionManager({ allowedToolIds: new Set(), confirmationTimeoutMs: 30_000 }),
        new Map(),
      ),
      verifier: new Verifier(),
      emailAssistant: email,
    });
    applications.push(application);

    expect(await application.readEmail({ from: "alice@example.com" })).toMatchObject({
      ok: true,
      value: [],
    });
    const draft: EmailDraft = {
      to: "bob@example.com",
      subject: "Update",
      body: "The work is complete.",
    };
    expect(application.draftEmail(draft)).toMatchObject({ ok: true, value: draft });
    expect(await application.sendEmail(draft, false)).toMatchObject({
      ok: false,
      error: { code: "NOVA-SEC001" },
    });
    expect(await application.sendEmail(draft, true)).toMatchObject({
      ok: true,
      value: { message_id: "sent-1" },
    });
  });

  it("routes calendar reads, proposals, and confirmed creates through the composed runtime", async () => {
    const calendar = new CalendarAssistant([
      {
        calendar_id: "personal",
        list: async () => [],
        create: async (draft) => ({ id: "event-1", ...draft }),
      },
    ]);
    const application = new RuntimeApplication({
      configuration,
      planner: new Planner({ deterministic: new Map() }),
      executor: new Executor(
        new PermissionManager({ allowedToolIds: new Set(), confirmationTimeoutMs: 30_000 }),
        new Map(),
      ),
      verifier: new Verifier(),
      calendarAssistant: calendar,
    });
    applications.push(application);

    expect(await application.upcomingCalendarEvents()).toMatchObject({ ok: true, value: [] });
    const draft: CalendarDraft = {
      title: "Planning",
      start: 100,
      end: 200,
      attendees: ["guest@example.com"],
      owner: true,
    };
    expect(await application.proposeCalendarEvent(draft)).toMatchObject({
      ok: true,
      value: { title: "Planning", conflicts: [] },
    });
    expect(await application.createCalendarEvent(draft, false)).toMatchObject({
      ok: false,
      error: { code: "NOVA-SEC001" },
    });
    expect(await application.createCalendarEvent(draft, true)).toMatchObject({
      ok: true,
      value: { id: "event-1" },
    });
  });

  it("routes authorized messaging-channel delivery through the composed runtime", async () => {
    const adapter: ChannelAdapter = {
      channel_id: "telegram",
      descriptor: {
        provider_id: "telegram",
        domain: "messaging-channel",
        privacy_class: "cloud",
        schema_version: "1.0.0",
        capabilities: ["send_message", "receive_message"],
        cost_per_request: 0,
        latency_p50_ms: 50,
      },
      healthCheck: async () => "reachable",
      invoke: async (request) => request,
      cancel: () => undefined,
      shutdown: () => undefined,
      sendMessage: async (chatId, content) => ({
        message_id: "message-1",
        status: "sent",
        chat_id: chatId,
        content,
      }),
      onMessage: () => undefined,
      supportsMedia: () => ({ images: true, audio: false, files: true }),
      resolveIdentity: () => ({ identity_id: "nova-user", authorized: true }),
    };
    const channels = new ChannelManager();
    expect(channels.register(adapter)).toMatchObject({ ok: true });
    const application = new RuntimeApplication({
      configuration,
      planner: new Planner({ deterministic: new Map() }),
      executor: new Executor(
        new PermissionManager({ allowedToolIds: new Set(), confirmationTimeoutMs: 30_000 }),
        new Map(),
      ),
      verifier: new Verifier(),
      channelManager: channels,
    });
    applications.push(application);

    expect(await application.sendChannelMessage("telegram", "chat-1", "hello")).toMatchObject({
      ok: true,
      value: { message_id: "message-1" },
    });
    expect(
      application.receiveChannelMessage("telegram", {
        sender_id: "user-1",
        chat_id: "chat-1",
        text: "hello",
        attachments: [],
      }),
    ).toMatchObject({ ok: true });
    expect(application.getChannelMediaCapabilities("telegram")).toMatchObject({
      ok: true,
      value: { images: true, audio: false, files: true },
    });
  });

  it("routes explicit background briefing generation and delivery through the composed runtime", async () => {
    const destination = { deliver: async () => undefined };
    const background = new BackgroundAssistant(
      [
        {
          source_id: "tasks",
          collect: async () => [
            {
              title: "Open task",
              summary: "One task remains.",
              source_id: "tasks",
              requires_confirmation: true,
            },
          ],
        },
      ],
      destination,
      { enabled: true },
    );
    const application = new RuntimeApplication({
      configuration,
      planner: new Planner({ deterministic: new Map() }),
      executor: new Executor(
        new PermissionManager({ allowedToolIds: new Set(), confirmationTimeoutMs: 30_000 }),
        new Map(),
      ),
      verifier: new Verifier(),
      backgroundAssistant: background,
    });
    applications.push(application);

    const briefing = await application.generateBackgroundBriefing("explicit-request");
    expect(briefing).toMatchObject({
      ok: true,
      value: { trigger: "explicit-request", items: [{ source_id: "tasks" }] },
    });
    expect(
      await application.deliverBackgroundBriefing(
        briefing.ok ? briefing.value : { trigger: "explicit-request", items: [] },
      ),
    ).toMatchObject({ ok: true });
  });

  it("delegates inspectable adaptive personalization proposals through the composed runtime", () => {
    const configurationStore = new ConfigurationStore({ initial: configuration });
    const adaptive = new AdaptivePersonalization(
      configurationStore,
      () => "2026-08-25T12:00:00.000Z",
    );
    const application = new RuntimeApplication({
      configuration,
      planner: new Planner({ deterministic: new Map() }),
      executor: new Executor(
        new PermissionManager({ allowedToolIds: new Set(), confirmationTimeoutMs: 30_000 }),
        new Map(),
      ),
      verifier: new Verifier(),
      adaptivePersonalization: adaptive,
    });
    applications.push(application);

    const proposal = application.proposeAdaptivePreference({
      id: "email.concise",
      category: "tool-default",
      value: { style: "concise" },
    });
    expect(proposal).toMatchObject({ ok: true, value: { status: "pending" } });
    expect(application.pendingAdaptivePreferences()).toHaveLength(1);
    expect(application.approveAdaptivePreference("email.concise")).toMatchObject({ ok: true });
    expect(configurationStore.snapshot().personalization.preferences).toHaveLength(1);
    expect(application.resetAdaptivePreference("email.concise")).toMatchObject({ ok: true });
    expect(configurationStore.snapshot().personalization.preferences).toHaveLength(0);
  });

  it("binds the default adaptive personalization manager to the shared configuration store", () => {
    const application = createApplication();
    applications.push(application);

    expect(
      application.proposeAdaptivePreference({
        id: "tone.concise",
        category: "tone",
        value: { style: "concise" },
      }),
    ).toMatchObject({ ok: true });
    expect(application.approveAdaptivePreference("tone.concise")).toMatchObject({ ok: true });
    expect(application.configuration.snapshot().personalization.preferences).toMatchObject([
      { id: "tone.concise", source: "feedback" },
    ]);
  });

  it("delegates personal analytics over caller-supplied permissioned records", () => {
    const input: AnalyticsInput = {
      period: { from: "2026-08-01T00:00:00.000Z", to: "2026-09-01T00:00:00.000Z" },
      activity: [
        {
          occurred_at: "2026-08-02T00:00:00.000Z",
          source: "applications",
          domain: "development",
          label: "Editor",
          duration_ms: 1_000,
        },
      ],
      tasks: [],
      provider_usage: [],
      communications: [],
    };
    const application = new RuntimeApplication({
      configuration,
      planner: new Planner({ deterministic: new Map() }),
      executor: new Executor(
        new PermissionManager({ allowedToolIds: new Set(), confirmationTimeoutMs: 30_000 }),
        new Map(),
      ),
      verifier: new Verifier(),
      personalAnalytics: new PersonalAnalytics(),
    });
    applications.push(application);

    expect(application.generatePersonalAnalytics(input)).toMatchObject({
      period: input.period,
      totals: { activity_duration_ms: 1_000 },
    });
  });

  it("delegates the ordered incident lifecycle and timeline through the composed runtime", () => {
    const incidentManager = new IncidentManager({
      owner: "desktop-runtime",
      now: () => 1_724_572_800_000,
    });
    const application = new RuntimeApplication({
      configuration,
      planner: new Planner({ deterministic: new Map() }),
      executor: new Executor(
        new PermissionManager({ allowedToolIds: new Set(), confirmationTimeoutMs: 30_000 }),
        new Map(),
      ),
      verifier: new Verifier(),
      incidentManager,
    });
    applications.push(application);

    const detected = application.detectIncident("Provider unavailable.");
    expect(detected).toMatchObject({ ok: true, value: { stage: "Detected" } });
    expect(application.triageIncident("inc-1", "High" as IncidentSeverity)).toMatchObject({
      ok: true,
      value: { stage: "Triaged", severity: "High" },
    });
    expect(application.mitigateIncident("inc-1", "Switched to local provider.")).toMatchObject({
      ok: true,
      value: { stage: "Mitigated" },
    });
    expect(application.resolveIncident("inc-1", "Provider recovered.")).toMatchObject({
      ok: true,
      value: { stage: "Resolved" },
    });
    expect(application.postmortemIncident("inc-1", "Added a health-check fallback.")).toMatchObject(
      {
        ok: true,
        value: { stage: "Postmortem" },
      },
    );
    expect(application.incidentTimeline("inc-1")).toHaveLength(5);
  });

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

  it("syncs and flushes through the composed cross-device manager", async () => {
    const sync = new CrossDeviceSyncManager(
      {
        pull: async () => ({ next_clock: 3, envelopes: [] }),
        encrypt: (payload) => payload,
        decrypt: (payload) => payload,
      },
      { granted_partitions: new Set(["security"]) },
    );
    const application = new RuntimeApplication({
      configuration,
      planner: new Planner({ deterministic: new Map() }),
      executor: new Executor(
        new PermissionManager({ allowedToolIds: new Set(), confirmationTimeoutMs: 30_000 }),
        new Map(),
      ),
      verifier: new Verifier(),
      crossDeviceSyncManager: sync,
    });
    applications.push(application);

    expect(await application.syncDevices()).toMatchObject({
      ok: true,
      value: { checkpoint: 3, applied_change_ids: [] },
    });
    expect(await application.flushDeviceSync()).toMatchObject({
      ok: true,
      value: { pushed_change_ids: [] },
    });
  });

  it("routes pairing offer creation and completion through the composed runtime", () => {
    const pairing = new DevicePairingManager({
      codeFactory: () => "PAIR",
      tokenFactory: () => "channel",
      verifySignature: () => true,
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

    const offer = application.createPairingOffer({
      runtime_mode: "Companion",
      primary_public_key: "primary",
    });
    expect(offer).toMatchObject({
      ok: true,
      value: {
        code: "PAIR",
        channel_token: "channel",
        runtime_mode: "Companion",
      },
    });
    if (!offer.ok) return;
    expect(
      application.completePairing(offer.value.code, {
        device_id: "android-1",
        device_public_key: "public-key",
        challenge: "challenge",
        signature: "signature",
        runtime_mode: "Companion",
        confirmed: true,
      }),
    ).toMatchObject({ ok: true, value: { device_id: "android-1", state: "Trusted" } });
  });

  it("revokes trusted devices through the composed runtime", async () => {
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
    const continuity = new SessionContinuityManager({ now: () => 1000 });
    continuity.registerDevice("android-1", ["camera"]);
    const remoteControl = new RemoteControlManager({
      verify: () => true,
      send: async () => undefined,
    });
    remoteControl.preApprove("android-1", 10_000);
    expect(
      remoteControl.requestSession({
        session_id: "remote-session-1",
        initiator_device_id: "android-1",
        signature: "signature",
      }),
    ).toMatchObject({ ok: true, value: { state: "Active" } });
    const application = new RuntimeApplication({
      configuration,
      planner: new Planner({ deterministic: new Map() }),
      executor: new Executor(
        new PermissionManager({ allowedToolIds: new Set(), confirmationTimeoutMs: 30_000 }),
        new Map(),
      ),
      verifier: new Verifier(),
      devicePairingManager: pairing,
      sessionContinuityManager: continuity,
      remoteControlManager: remoteControl,
    });
    applications.push(application);

    expect(application.revokeTrustedDevice("android-1")).toMatchObject({ ok: true });
    expect(application.listTrustedDevices()).toEqual([]);
    expect(application.listDeviceSnapshots()).toEqual([]);
    expect(
      await remoteControl.execute("remote-session-1", {
        command_id: "command-1",
        content: "status",
        destructive: false,
      }),
    ).toMatchObject({ ok: false, error: { code: "NOVA-SEC001" } });
    expect(application.revokeTrustedDevice("android-1")).toMatchObject({
      ok: false,
      error: { code: "NOVA-SEC001" },
    });
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
