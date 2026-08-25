import { afterEach, describe, expect, it, vi } from "vitest";
import { rm } from "node:fs/promises";
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
import { RunbookManager, type RunbookIncident } from "../src/runbook-manager.js";
import { CapabilityRegistry, type Provider } from "../src/provider-registry.js";
import { LocalModelManager, type LocalModelCatalogEntry } from "../src/local-model-manager.js";
import type { HardwareProfile } from "../src/hardware-detection.js";
import { VoicePipeline } from "../src/voice-pipeline.js";
import { PluginDiscovery, type PluginIndexEntry } from "../src/plugin-discovery.js";
import { BackupManager, type BackupBackend } from "../src/backup-manager.js";
import { RestoreManager } from "../src/restore-manager.js";
import { UpgradeManager, type UpgradeAdapter } from "../src/upgrade-manager.js";
import { RepairManager } from "../src/repair-manager.js";
import { ResourceManager } from "../src/resource-manager.js";
import { HardwareDetector, type HardwareProbe } from "../src/hardware-detection.js";
import { SetupWizard } from "../src/setup-wizard.js";
import { WorkspaceManager } from "../src/workspace-manager.js";
import { ModelRouter, type LlmProvider } from "../src/model-router.js";
import { PerformanceBudgetEvaluator, type BudgetSamples } from "../src/performance-budgets.js";
import {
  compareDeviceVersions,
  LogicalClock,
  type LogicalClockValue,
} from "../src/device-compatibility.js";
import { RuntimeManager } from "../src/runtime-manager.js";
import type { ServiceLifecycle } from "@nova/shared";
import { PluginManager } from "../src/plugin-manager.js";
import { PermissionGrantStore } from "../src/permission-grant-store.js";
import { InMemoryJobStore, JobScheduler } from "../src/job-scheduler.js";
import { SystemLifecycleOrchestrator } from "../src/system-lifecycle.js";
import { NetworkDiscoveryManager } from "../src/networking.js";
import { WindowsSystemInventory } from "../src/system-inventory.js";
import { SessionContinuityManager } from "../src/session-continuity.js";
import {
  OfflineActionQueue,
  type OfflineAction,
  type ResourceRequest,
  ResourceArbitrator,
} from "../src/resource-arbitration.js";
import { DevicePairingManager } from "../src/device-pairing.js";
import { CrossDeviceSyncManager } from "../src/cross-device-sync.js";
import { Executor, PermissionManager, Planner, Verifier } from "../src/orchestration.js";
import { RuntimeApplication } from "../src/runtime-application.js";
import { TaskScheduler } from "../src/task-scheduler.js";
import { WorkflowEngine } from "../src/workflow-engine.js";
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
  it("requires explicit confirmation before changing observation permissions", async () => {
    const application = new RuntimeApplication({
      configuration,
      planner: new Planner({ deterministic: new Map() }),
      executor: new Executor(
        new PermissionManager({ allowedToolIds: new Set(), confirmationTimeoutMs: 30_000 }),
        new Map(),
      ),
      verifier: new Verifier(),
      permissionStore: new PermissionGrantStore({
        initial: [{ source: "browser_metadata", granted: false }],
      }),
    });
    applications.push(application);

    expect(await application.setPermission("browser_metadata", true, false)).toMatchObject({
      ok: false,
      error: { code: "NOVA-SEC001" },
    });
    expect(application.permissions.list()).toEqual([
      { source: "browser_metadata", granted: false },
    ]);
    expect(await application.setPermission("browser_metadata", true, true)).toMatchObject({
      ok: true,
      value: [{ source: "browser_metadata", granted: true }],
    });
  });

  it("requires explicit confirmation before changing configuration", () => {
    const application = createApplication();
    applications.push(application);

    expect(
      application.updateConfiguration("voice", { ...configuration.voice, enabled: true }, false),
    ).toMatchObject({
      ok: false,
      error: { code: "NOVA-SEC001" },
    });
    expect(application.configuration.snapshot().voice.enabled).toBe(false);
    expect(
      application.updateConfiguration("voice", { ...configuration.voice, enabled: true }, true),
    ).toMatchObject({ ok: true });
    expect(application.configuration.snapshot().voice.enabled).toBe(true);
  });

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
    expect(application.setAndroidCompanionPermission("camera", true, false)).toMatchObject({
      ok: false,
      error: { code: "NOVA-SEC001" },
    });
    expect(application.setAndroidCompanionPermission("camera", true, true)).toMatchObject({
      ok: true,
    });
    expect(application.checkAndroidCompanionCapability(capability)).toMatchObject({
      ok: true,
      value: { status: "Available", device_id: "android-1" },
    });
    expect(application.setAndroidCompanionPermission("camera", false, true)).toMatchObject({
      ok: true,
    });
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

    expect(application.startAndroidCompanionBackground("notifications", false)).toMatchObject({
      ok: false,
      error: { code: "NOVA-SEC001" },
    });
    expect(application.startAndroidCompanionForegroundService(false)).toMatchObject({
      ok: false,
      error: { code: "NOVA-SEC001" },
    });
    expect(application.startAndroidCompanionForegroundService(true)).toMatchObject({ ok: true });
    expect(application.startAndroidCompanionBackground("notifications", true)).toMatchObject({
      ok: true,
    });
    expect(application.stopAndroidCompanionForegroundService(false)).toMatchObject({
      ok: false,
      error: { code: "NOVA-SEC001" },
    });
    expect(application.stopAndroidCompanionForegroundService(true)).toMatchObject({ ok: true });
    expect(application.startAndroidCompanionBackground("notifications", true)).toMatchObject({
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

    expect(
      await application.sendChannelMessage("telegram", "chat-1", "hello", false),
    ).toMatchObject({
      ok: false,
      error: { code: "NOVA-SEC001" },
    });
    expect(await application.sendChannelMessage("telegram", "chat-1", "hello", true)).toMatchObject(
      {
        ok: true,
        value: { message_id: "message-1" },
      },
    );
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
    expect(application.approveAdaptivePreference("email.concise", false)).toMatchObject({
      ok: false,
      error: { code: "NOVA-SEC001" },
    });
    expect(configurationStore.snapshot().personalization.preferences).toHaveLength(0);
    expect(application.approveAdaptivePreference("email.concise", true)).toMatchObject({
      ok: true,
    });
    expect(configurationStore.snapshot().personalization.preferences).toHaveLength(1);
    expect(application.resetAdaptivePreference("email.concise", false)).toMatchObject({
      ok: false,
      error: { code: "NOVA-SEC001" },
    });
    expect(configurationStore.snapshot().personalization.preferences).toHaveLength(1);
    expect(application.resetAdaptivePreference("email.concise", true)).toMatchObject({ ok: true });
    expect(configurationStore.snapshot().personalization.preferences).toHaveLength(0);
  });

  it("exposes only bounded metadata for pending adaptive proposals", () => {
    const adaptive = new AdaptivePersonalization(
      new ConfigurationStore({ initial: configuration }),
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

    expect(
      application.proposeAdaptivePreference({
        id: "tone.secret",
        category: "tone",
        value: { secret: "must-not-cross-ipc" },
      }),
    ).toMatchObject({ ok: true });

    expect(application.pendingAdaptivePreferenceSummaries()).toEqual([
      { proposal_id: "tone.secret", status: "pending", category: "tone" },
    ]);
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
    expect(application.approveAdaptivePreference("tone.concise", true)).toMatchObject({ ok: true });
    expect(application.configuration.snapshot().personalization.preferences).toMatchObject([
      { id: "tone.concise", source: "feedback" },
    ]);
  });

  it("exposes privacy-safe workflow checkpoint summaries through the composed runtime", async () => {
    const workflowEngine = new WorkflowEngine({
      execute: async () =>
        ok({
          step_id: "unused",
          status: "success",
          evidence: { type: "none", value: null },
          affected_resources: [],
        }),
      verify: () =>
        ok({
          step_id: "unused",
          outcome: "verified",
          confidence: 1,
          verification_method: "ground_truth",
          explanation: "test",
        }),
    });
    const application = new RuntimeApplication({
      configuration,
      planner: new Planner({ deterministic: new Map() }),
      executor: new Executor(
        new PermissionManager({ allowedToolIds: new Set(), confirmationTimeoutMs: 30_000 }),
        new Map(),
      ),
      verifier: new Verifier(),
      workflowEngine,
    });
    applications.push(application);
    await workflowEngine.run(
      {
        workflow_id: "workflow.summary",
        start_node_id: "end",
        nodes: [{ id: "end", type: "end" }],
        edges: [],
      },
      { secret: "never expose" },
    );

    const summaries = application.workflowCheckpointSummaries("workflow.summary");
    expect(summaries).toMatchObject({
      ok: true,
      value: expect.arrayContaining([
        expect.objectContaining({
          checkpoint_id: expect.any(String),
          workflow_id: "workflow.summary",
          state: "Valid",
          completed_node_count: expect.any(Number),
          created_at: expect.any(String),
        }),
      ]),
    });
    if (summaries.ok) {
      expect(
        summaries.value.every(
          (summary) =>
            Object.keys(summary).sort().join(",") ===
            "checkpoint_id,completed_node_count,created_at,state,workflow_id",
        ),
      ).toBe(true);
    }
  });

  it("requires confirmation before resuming a workflow checkpoint", async () => {
    const workflowEngine = new WorkflowEngine({
      execute: async () =>
        ok({
          step_id: "unused",
          status: "success",
          evidence: { type: "none", value: null },
          affected_resources: [],
        }),
      verify: () =>
        ok({
          step_id: "unused",
          outcome: "verified",
          confidence: 1,
          verification_method: "ground_truth",
          explanation: "test",
        }),
    });
    const application = new RuntimeApplication({
      configuration,
      planner: new Planner({ deterministic: new Map() }),
      executor: new Executor(
        new PermissionManager({ allowedToolIds: new Set(), confirmationTimeoutMs: 30_000 }),
        new Map(),
      ),
      verifier: new Verifier(),
      workflowEngine,
    });
    applications.push(application);

    expect(await application.resumeWorkflowCheckpoint("missing", false)).toMatchObject({
      ok: false,
      error: { code: "NOVA-SEC001" },
    });
    expect(await application.resumeWorkflowCheckpoint("missing", true)).toMatchObject({
      ok: false,
      error: { code: "NOVA-WFL002" },
    });
  });

  it("denies permission-blocked WaitingUser tasks only with confirmation", async () => {
    const application = createApplication();
    applications.push(application);
    const permissionTask = application.tasks.create({ goal: "deny permission" });
    if (!permissionTask.ok) throw new Error("Task creation failed.");
    expect(application.tasks.transition(permissionTask.value.task_id, "Paused")).toMatchObject({
      ok: true,
    });
    expect(
      application.tasks.transition(
        permissionTask.value.task_id,
        "WaitingUser",
        "permission_confirmation",
      ),
    ).toMatchObject({ ok: true });

    expect(
      await application.denyWaitingUserTask(permissionTask.value.task_id, false),
    ).toMatchObject({
      ok: false,
      error: { code: "NOVA-SEC001" },
    });
    expect(await application.denyWaitingUserTask(permissionTask.value.task_id, true)).toMatchObject(
      {
        ok: true,
        value: { state: "Cancelled", reason: "denied" },
      },
    );
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

  it("delegates injected runbook handling without inventing recovery operations", async () => {
    const operations = {
      restoreLastKnownGoodConfig: async () => false,
      engageProviderFallback: async () => true,
      resumeSyncCheckpoint: async () => false,
      fullResync: async () => false,
      notifyDegraded: async () => undefined,
    };
    const runbook = new RunbookManager(operations);
    const application = new RuntimeApplication({
      configuration,
      planner: new Planner({ deterministic: new Map() }),
      executor: new Executor(
        new PermissionManager({ allowedToolIds: new Set(), confirmationTimeoutMs: 30_000 }),
        new Map(),
      ),
      verifier: new Verifier(),
      runbookManager: runbook,
    });
    applications.push(application);

    expect(await application.handleRunbook("provider-down" as RunbookIncident)).toMatchObject({
      ok: true,
      value: { state: "Resolved", action: "provider-fallback" },
    });
  });

  it("delegates capability registry inspection and live provider edits", () => {
    const provider = {
      descriptor: {
        provider_id: "local-llm",
        domain: "llm",
        privacy_class: "local",
        schema_version: "1.0.0",
        capabilities: [],
        cost_per_request: 0,
        latency_p50_ms: 20,
      },
      healthCheck: async () => "reachable" as const,
      invoke: async () => undefined,
      cancel: () => undefined,
      shutdown: () => undefined,
    } satisfies Provider;
    const registry = new CapabilityRegistry();
    expect(registry.register("llm", provider)).toMatchObject({ ok: true });
    const application = new RuntimeApplication({
      configuration,
      planner: new Planner({ deterministic: new Map() }),
      executor: new Executor(
        new PermissionManager({ allowedToolIds: new Set(), confirmationTimeoutMs: 30_000 }),
        new Map(),
      ),
      verifier: new Verifier(),
      capabilityRegistry: registry,
    });
    applications.push(application);

    expect(application.getCapabilityRecord("llm")).toMatchObject({
      ok: true,
      value: { capability_id: "llm", state: "Active" },
    });
    expect(
      application.setCapabilityProviderEnabled("llm", "local-llm", false, false),
    ).toMatchObject({
      ok: false,
      error: { code: "NOVA-SEC001" },
    });
    expect(application.getCapabilityRecord("llm")).toMatchObject({
      ok: true,
      value: { state: "Active", providers: [{ enabled: true }] },
    });
    expect(application.setCapabilityProviderEnabled("llm", "local-llm", false, true)).toMatchObject(
      {
        ok: true,
        value: { state: "Configured, disabled" },
      },
    );
    expect(application.setCapabilityProviderPriority("llm", "local-llm", 0, false)).toMatchObject({
      ok: false,
      error: { code: "NOVA-SEC001" },
    });
    expect(application.getCapabilityRecord("llm")).toMatchObject({
      ok: true,
      value: { providers: [{ priority: 1 }] },
    });
    expect(application.setCapabilityProviderPriority("llm", "local-llm", 0, true)).toMatchObject({
      ok: true,
      value: { providers: [{ priority: 0 }] },
    });
    expect(
      application.setCapabilityPolicy(
        "llm",
        { policy: "manual", manual_override: "local-llm" },
        false,
      ),
    ).toMatchObject({
      ok: false,
      error: { code: "NOVA-SEC001" },
    });
    expect(application.getCapabilityRecord("llm")).toMatchObject({
      ok: true,
      value: { active_policy: { policy: "privacy-first" } },
    });
    expect(
      application.setCapabilityPolicy(
        "llm",
        { policy: "manual", manual_override: "local-llm" },
        true,
      ),
    ).toMatchObject({
      ok: true,
      value: { active_policy: { policy: "manual", manual_override: "local-llm" } },
    });
  });

  it("exposes reclaimable local-model summaries without storage metadata", () => {
    const models = new LocalModelManager({
      storagePath: "/tmp/nova-test-models",
      catalog: [],
      fetchModel: async () => new Uint8Array(),
      loadAdapter: async () => ({}),
    });
    const application = new RuntimeApplication({
      configuration,
      planner: new Planner({ deterministic: new Map() }),
      executor: new Executor(
        new PermissionManager({ allowedToolIds: new Set(), confirmationTimeoutMs: 30_000 }),
        new Map(),
      ),
      verifier: new Verifier(),
      localModelManager: models,
    });
    applications.push(application);

    expect(application.reclaimableLocalModelSummaries()).toEqual({ ok: true, value: [] });

    const unavailable = new RuntimeApplication({
      configuration,
      planner: new Planner({ deterministic: new Map() }),
      executor: new Executor(
        new PermissionManager({ allowedToolIds: new Set(), confirmationTimeoutMs: 30_000 }),
        new Map(),
      ),
      verifier: new Verifier(),
    });
    applications.push(unavailable);
    expect(unavailable.reclaimableLocalModelSummaries()).toMatchObject({
      ok: false,
      error: { code: "NOVA-SEC001", retryable: false },
    });
  });

  it("delegates catalog-backed local-model discovery without downloading model bytes", () => {
    const entry: LocalModelCatalogEntry = {
      model_id: "whisper-small",
      provider_id: "whisper-local",
      domain: "speech-to-text",
      download_url: "https://models.example.test/whisper-small.bin",
      sha256: "a".repeat(64),
      size_bytes: 10,
      minimum_hardware_tier: "Standard",
      adapter_id: "onnx-whisper",
    };
    const localModels = new LocalModelManager({
      storagePath: "/tmp/nova-models",
      catalog: [entry],
      fetchModel: async () => new Uint8Array(),
      loadAdapter: async () => ({}),
    });
    const application = new RuntimeApplication({
      configuration,
      planner: new Planner({ deterministic: new Map() }),
      executor: new Executor(
        new PermissionManager({ allowedToolIds: new Set(), confirmationTimeoutMs: 30_000 }),
        new Map(),
      ),
      verifier: new Verifier(),
      localModelManager: localModels,
    });
    applications.push(application);
    const hardware = {
      scanned_at: "2026-08-25T00:00:00.000Z",
      signals: {
        cpu_architecture: "x86_64",
        cpu_cores: 8,
        avx2: true,
        avx512: false,
        gpu_vendor: "nvidia",
        gpu_vram_gb: 8,
        gpu_accelerator: "cuda",
        system_ram_gb: 16,
        available_disk_gb: 100,
        os: "linux",
        battery_powered: false,
      },
      overall_tier: "Standard",
      recommendations: {
        llm: "local-or-cloud",
        vision: "local-or-cloud",
        speech: "local-or-cloud",
      },
    } satisfies HardwareProfile;

    expect(application.discoverLocalModels(hardware)).toMatchObject([
      {
        model_id: "whisper-small",
        availability: "recommended",
        status: "not-downloaded",
      },
    ]);
  });

  it("requires explicit confirmation before downloading a catalog local model", async () => {
    const storagePath = "/tmp/nova-confirmed-model-download";
    await rm(storagePath, { recursive: true, force: true });
    const entry: LocalModelCatalogEntry = {
      model_id: "whisper-small",
      provider_id: "whisper-local",
      domain: "speech-to-text",
      download_url: "https://models.example.test/whisper-small.bin",
      sha256: "01d448afd928065458cf670b60f5a594d735af0172c8d67f22a81680132681ca",
      size_bytes: 10,
      minimum_hardware_tier: "Standard",
      adapter_id: "onnx-whisper",
    };
    const localModels = new LocalModelManager({
      storagePath,
      catalog: [entry],
      fetchModel: async () => new Uint8Array(10),
      loadAdapter: async () => ({}),
    });
    const application = new RuntimeApplication({
      configuration,
      planner: new Planner({ deterministic: new Map() }),
      executor: new Executor(
        new PermissionManager({ allowedToolIds: new Set(), confirmationTimeoutMs: 30_000 }),
        new Map(),
      ),
      verifier: new Verifier(),
      localModelManager: localModels,
    });
    applications.push(application);

    expect(await application.downloadLocalModel("whisper-small", false)).toMatchObject({
      ok: false,
      error: { code: "NOVA-SEC001" },
    });
    expect(
      localModels.discover({
        scanned_at: "2026-08-25T00:00:00.000Z",
        signals: {},
        overall_tier: "Standard",
        recommendations: {},
      }),
    ).toMatchObject([{ status: "not-downloaded" }]);
    expect(await application.downloadLocalModel("whisper-small", true)).toMatchObject({
      ok: true,
      value: {
        model_id: "whisper-small",
        provider_id: "whisper-local",
        bytes: 10,
        status: "downloaded",
      },
    });
    expect(await application.loadLocalModel("whisper-small", false)).toMatchObject({
      ok: false,
      error: { code: "NOVA-SEC001" },
    });
    expect(await application.loadLocalModel("whisper-small", true)).toMatchObject({
      ok: true,
      value: {
        model_id: "whisper-small",
        provider_id: "whisper-local",
      },
    });
    expect(await application.retireLocalModel("whisper-small", false)).toMatchObject({
      ok: false,
      error: { code: "NOVA-SEC001" },
    });
    expect(localModels.reclaimableSummaries()).toEqual([]);
    expect(await application.retireLocalModel("whisper-small", true)).toMatchObject({
      ok: true,
      value: { model_id: "whisper-small", status: "reclaimable" },
    });
    await rm(storagePath, { recursive: true, force: true });
  });

  it("delegates safe VoicePipeline lifecycle controls without exposing raw audio", async () => {
    const voice = new VoicePipeline({
      wakeWordDetector: { start: async () => undefined, stop: async () => undefined },
      transcribe: async function* () {
        yield { text: "hello", final: true };
      },
      plan: async (transcript) => transcript,
      speak: async () => undefined,
      cancelSpeech: () => undefined,
    });
    const application = new RuntimeApplication({
      configuration,
      planner: new Planner({ deterministic: new Map() }),
      executor: new Executor(
        new PermissionManager({ allowedToolIds: new Set(), confirmationTimeoutMs: 30_000 }),
        new Map(),
      ),
      verifier: new Verifier(),
      voicePipeline: voice,
    });
    applications.push(application);

    expect(await application.startVoicePipeline(false)).toMatchObject({
      ok: false,
      error: { code: "NOVA-SEC001" },
    });
    expect(await application.startVoicePipeline(true)).toMatchObject({
      ok: true,
      value: { state: "Listening" },
    });
    expect(application.voicePipelineState()).toBe("Listening");
    expect(application.bargeInVoice()).toMatchObject({ ok: true, value: { state: "Listening" } });
    expect(await application.stopVoicePipeline(false)).toMatchObject({
      ok: false,
      error: { code: "NOVA-SEC001" },
    });
    expect(await application.stopVoicePipeline(true)).toMatchObject({
      ok: true,
      value: { state: "Idle" },
    });
  });

  it("delegates trust-filtered plugin discovery with explicit confirmation only", async () => {
    const candidate: PluginIndexEntry = {
      plugin_id: "com.example.calendar",
      latest_version: "1.0.0",
      publisher: "Example",
      source_url: "https://plugins.example.test/calendar",
      signature_key: "signature-key",
      capabilities: ["calendar"],
      required_permissions: ["calendar.read"],
      trust: { verified_publisher: true, security_reviewed: true, download_count: 100 },
    };
    const discovery = new PluginDiscovery({ search: async () => [candidate] });
    const application = new RuntimeApplication({
      configuration,
      planner: new Planner({ deterministic: new Map() }),
      executor: new Executor(
        new PermissionManager({ allowedToolIds: new Set(), confirmationTimeoutMs: 30_000 }),
        new Map(),
      ),
      verifier: new Verifier(),
      pluginDiscovery: discovery,
    });
    applications.push(application);

    const result = await application.discoverPluginsForGap({
      capability_id: "calendar",
      domain: "calendar",
      enabled_provider_count: 0,
    });
    expect(result).toMatchObject({
      ok: true,
      value: { proposals: [{ plugin_id: "com.example.calendar", status: "pending" }] },
    });
    expect(application.pendingPluginDiscovery()).toHaveLength(1);
    expect(application.confirmPluginDiscovery("com.example.calendar", false)).toMatchObject({
      ok: false,
      error: { code: "NOVA-SEC001" },
    });
    expect(application.pendingPluginDiscovery()).toHaveLength(1);
    expect(application.confirmPluginDiscovery("com.example.calendar", true)).toMatchObject({
      ok: true,
      value: { status: "approved" },
    });
    expect(application.pendingPluginDiscovery()).toHaveLength(0);
  });

  it("delegates owner-scoped backup creation and non-destructive restoration", () => {
    const snapshots = new Map<string, string>();
    const backend: BackupBackend = {
      write: (snapshotId, contents) => snapshots.set(snapshotId, contents),
      read: (snapshotId) => snapshots.get(snapshotId),
      delete: (snapshotId) => snapshots.delete(snapshotId),
      list: () => [...snapshots.keys()],
    };
    const backup = new BackupManager(backend, {
      ownerId: "owner-1",
      idFactory: () => "snapshot-1",
      encrypt: (plainText) => plainText,
      decrypt: (cipherText) => cipherText,
    });
    const application = new RuntimeApplication({
      configuration,
      planner: new Planner({ deterministic: new Map() }),
      executor: new Executor(
        new PermissionManager({ allowedToolIds: new Set(), confirmationTimeoutMs: 30_000 }),
        new Map(),
      ),
      verifier: new Verifier(),
      backupManager: backup,
    });
    applications.push(application);

    expect(application.createBackup({ theme: "dark" }, false)).toMatchObject({
      ok: false,
      error: { code: "NOVA-SEC001" },
    });
    expect(application.createBackup({ theme: "dark" }, true)).toMatchObject({
      ok: true,
      value: { snapshot_id: "snapshot-1", owner_id: "owner-1", encrypted: true },
    });
    expect(application.restoreBackup<{ theme: string }>("snapshot-1", false)).toMatchObject({
      ok: false,
      error: { code: "NOVA-SEC001" },
    });
    expect(application.restoreBackup<{ theme: string }>("snapshot-1", true)).toMatchObject({
      ok: true,
      value: { theme: "dark" },
    });
    expect(application.preUpdateBackup({ theme: "dark" }, false)).toMatchObject({
      ok: false,
      error: { code: "NOVA-SEC001" },
    });
    expect(application.preUpdateBackup({ theme: "dark" }, true)).toMatchObject({
      ok: true,
      value: { snapshot_id: "snapshot-1", owner_id: "owner-1", encrypted: true },
    });
  });

  it("stages restores and requires explicit confirmation before applying live state", async () => {
    let liveState: unknown = { theme: "light" };
    const restore = new RestoreManager(
      { load: async () => ({ theme: "dark" }) },
      {
        read: async () => liveState,
        swap: async (state) => {
          liveState = state;
        },
      },
    );
    const application = new RuntimeApplication({
      configuration,
      planner: new Planner({ deterministic: new Map() }),
      executor: new Executor(
        new PermissionManager({ allowedToolIds: new Set(), confirmationTimeoutMs: 30_000 }),
        new Map(),
      ),
      verifier: new Verifier(),
      restoreManager: restore,
    });
    applications.push(application);

    const prepared = await application.prepareRestore("snapshot-1");
    expect(prepared).toMatchObject({
      ok: true,
      value: { verified: true, staging: { theme: "dark" } },
    });
    if (!prepared.ok) throw new Error("Expected restore preparation to succeed.");
    expect(await application.applyPreparedRestore(prepared.value, false)).toMatchObject({
      ok: false,
      error: { code: "NOVA-SEC001" },
    });
    expect(liveState).toEqual({ theme: "light" });
    expect(await application.applyPreparedRestore(prepared.value, true)).toMatchObject({
      ok: true,
    });
    expect(liveState).toEqual({ theme: "dark" });
  });

  it("requires explicit confirmation before executing a forward-only runtime upgrade", async () => {
    const calls: string[] = [];
    const adapter: UpgradeAdapter = {
      snapshot: async () => {
        calls.push("snapshot");
        return "snapshot-1";
      },
      migrate: async (fromVersion, toVersion) => {
        calls.push(`migrate:${fromVersion}-${toVersion}`);
        return { version: toVersion };
      },
      updatePlugins: async () => {
        calls.push("plugins");
      },
      verify: async () => {
        calls.push("verify");
        return true;
      },
      rollback: async (snapshotId) => {
        calls.push(`rollback:${snapshotId}`);
      },
    };
    const upgrade = new UpgradeManager(adapter);
    const application = new RuntimeApplication({
      configuration,
      planner: new Planner({ deterministic: new Map() }),
      executor: new Executor(
        new PermissionManager({ allowedToolIds: new Set(), confirmationTimeoutMs: 30_000 }),
        new Map(),
      ),
      verifier: new Verifier(),
      upgradeManager: upgrade,
    });
    applications.push(application);

    expect(
      await application.upgradeRuntime({ current_version: 1, target_version: 3 }, false),
    ).toMatchObject({
      ok: false,
      error: { code: "NOVA-SEC001" },
    });
    expect(calls).toEqual([]);
    expect(
      await application.upgradeRuntime({ current_version: 1, target_version: 3 }, true),
    ).toMatchObject({
      ok: true,
      value: { status: "Upgraded", version: 3 },
    });
    expect(calls).toEqual(["snapshot", "migrate:1-2", "migrate:2-3", "plugins", "verify"]);
  });

  it("delegates bounded repair inspection and explicit safe-fix application", async () => {
    const fixed: string[] = [];
    const repair = new RepairManager({
      inspect: async () => [
        { issue_id: "safe-1", kind: "stale-cache", safe: true },
        { issue_id: "unsafe-1", kind: "configuration-drift", safe: false },
      ],
      fix: async (issueId) => {
        fixed.push(issueId);
      },
    });
    const application = new RuntimeApplication({
      configuration,
      planner: new Planner({ deterministic: new Map() }),
      executor: new Executor(
        new PermissionManager({ allowedToolIds: new Set(), confirmationTimeoutMs: 30_000 }),
        new Map(),
      ),
      verifier: new Verifier(),
      repairManager: repair,
    });
    applications.push(application);

    expect(await application.repairRuntime({ apply: false })).toMatchObject({
      ok: true,
      value: { applied: [], reported: [{ issue_id: "safe-1" }, { issue_id: "unsafe-1" }] },
    });
    expect(fixed).toEqual([]);
    expect(await application.repairRuntime({ apply: true }, false)).toMatchObject({
      ok: false,
      error: { code: "NOVA-SEC001" },
    });
    expect(fixed).toEqual([]);
    expect(await application.repairRuntime({ apply: true }, true)).toMatchObject({
      ok: true,
      value: { applied: ["safe-1"], reported: [{ issue_id: "unsafe-1" }] },
    });
    expect(fixed).toEqual(["safe-1"]);
  });

  it("exposes held resource locks without queued request details", () => {
    const resources = new ResourceManager({ now: () => 1000 });
    resources.acquire("task-1", ["gpu", "disk"]);
    resources.acquire("task-2", ["gpu"]);
    const application = new RuntimeApplication({
      configuration,
      planner: new Planner({ deterministic: new Map() }),
      executor: new Executor(
        new PermissionManager({ allowedToolIds: new Set(), confirmationTimeoutMs: 30_000 }),
        new Map(),
      ),
      verifier: new Verifier(),
      resourceManager: resources,
    });
    applications.push(application);

    expect(application.heldResourceLocks()).toEqual({
      ok: true,
      value: [
        { resource: "disk", task_id: "task-1", acquired_at: 1000 },
        { resource: "gpu", task_id: "task-1", acquired_at: 1000 },
      ],
    });
  });

  it("delegates bounded resource locking, release, and expiry", () => {
    let now = 100;
    const resources = new ResourceManager({ maxLockDurationMs: 10, now: () => now });
    const application = new RuntimeApplication({
      configuration,
      planner: new Planner({ deterministic: new Map() }),
      executor: new Executor(
        new PermissionManager({ allowedToolIds: new Set(), confirmationTimeoutMs: 30_000 }),
        new Map(),
      ),
      verifier: new Verifier(),
      resourceManager: resources,
    });
    applications.push(application);

    expect(application.acquireResources("task-1", ["gpu", "gpu"])).toMatchObject({
      ok: true,
      value: { status: "granted", resources: ["gpu"] },
    });
    expect(application.acquireResources("task-2", ["gpu"])).toMatchObject({
      ok: true,
      value: { status: "queued", task_id: "task-2" },
    });
    expect(application.releaseResources("task-1")).toMatchObject({ ok: true, value: ["task-2"] });
    expect(application.resourceHolder("gpu")).toBe("task-2");
    now = 110;
    expect(application.expireResourceLocks()).toEqual(["task-2"]);
    expect(application.resourceHolder("gpu")).toBeUndefined();
  });

  it("delegates consent-gated cross-device resource arbitration", () => {
    const arbitration = new ResourceArbitrator();
    const application = new RuntimeApplication({
      configuration,
      planner: new Planner({ deterministic: new Map() }),
      executor: new Executor(
        new PermissionManager({ allowedToolIds: new Set(), confirmationTimeoutMs: 30_000 }),
        new Map(),
      ),
      verifier: new Verifier(),
      resourceArbitrator: arbitration,
    });
    applications.push(application);
    const local: ResourceRequest = { request_id: "local-1", origin: "local" };
    const remote: ResourceRequest = { request_id: "remote-1", origin: "remote" };

    expect(application.acquireArbitratedResource("microphone", local)).toMatchObject({
      ok: true,
      value: { status: "Granted", request_id: "local-1" },
    });
    expect(application.acquireArbitratedResource("microphone", remote)).toMatchObject({
      ok: true,
      value: { status: "Queued", request_id: "remote-1" },
    });
    expect(application.releaseArbitratedResource("microphone", "local-1")).toMatchObject({
      ok: true,
      value: { granted_request_id: "remote-1" },
    });
    expect(
      application.acquireArbitratedResource("microphone", {
        request_id: "remote-2",
        origin: "remote",
        explicit_remote_override: true,
      }),
    ).toMatchObject({ ok: true, value: { status: "Granted", request_id: "remote-2" } });
  });

  it("queues offline actions and only executes them after explicit reconnect", async () => {
    const executed: string[] = [];
    const queue = new OfflineActionQueue(async (action: OfflineAction) => {
      executed.push(action.action_id);
      return { action_id: action.action_id, status: "completed" };
    });
    queue.setOnline(false);
    const application = new RuntimeApplication({
      configuration,
      planner: new Planner({ deterministic: new Map() }),
      executor: new Executor(
        new PermissionManager({ allowedToolIds: new Set(), confirmationTimeoutMs: 30_000 }),
        new Map(),
      ),
      verifier: new Verifier(),
      offlineActionQueue: queue,
    });
    applications.push(application);

    expect(
      await application.submitOfflineAction({ action_id: "remote-1", description: "sync" }, false),
    ).toMatchObject({
      ok: false,
      error: { code: "NOVA-SEC001" },
    });
    expect(executed).toEqual([]);
    expect(
      await application.submitOfflineAction({ action_id: "remote-1", description: "sync" }, true),
    ).toMatchObject({
      ok: true,
      value: { status: "QueuedOffline" },
    });
    expect(executed).toEqual([]);
    expect(await application.reconnectOfflineActions(false)).toMatchObject({
      ok: false,
      error: { code: "NOVA-SEC001" },
    });
    expect(executed).toEqual([]);
    expect(await application.reconnectOfflineActions(true)).toMatchObject({
      ok: true,
      value: [{ action_id: "remote-1", status: "completed" }],
    });
    expect(executed).toEqual(["remote-1"]);
  });

  it("delegates setup-wizard start, deferral, and summary state", async () => {
    const probe: HardwareProbe = {
      cpu_architecture: "x86_64",
      cpu_cores: 8,
      avx2: true,
      avx512: false,
      gpu_vendor: null,
      gpu_vram_gb: 0,
      gpu_accelerator: null,
      system_ram_gb: 8,
      available_disk_gb: 100,
      os: "linux",
      battery_powered: false,
    };
    const configurationStore = new ConfigurationStore({ initial: configuration });
    const wizard = new SetupWizard(configurationStore, new HardwareDetector(async () => probe));
    const application = new RuntimeApplication({
      configuration,
      planner: new Planner({ deterministic: new Map() }),
      executor: new Executor(
        new PermissionManager({ allowedToolIds: new Set(), confirmationTimeoutMs: 30_000 }),
        new Map(),
      ),
      verifier: new Verifier(),
      setupWizard: wizard,
    });
    applications.push(application);

    const started = await application.startSetupWizard();
    expect(started).toMatchObject({ ok: true, value: { current_step: "core-llm" } });
    const initialConfiguration = configurationStore.snapshot();
    expect(
      application.completeSetupStep("core-llm", { section: "capabilities", value: {} }, false),
    ).toMatchObject({ ok: false, error: { code: "NOVA-SEC001" } });
    expect(application.setupSummary()).toMatchObject({
      ok: true,
      value: { current_step: "core-llm" },
    });
    expect(configurationStore.snapshot()).toEqual(initialConfiguration);
    expect(
      application.completeSetupStep("core-llm", { section: "capabilities", value: {} }, true),
    ).toMatchObject({
      ok: true,
      value: { current_step: "perception" },
    });
    expect(application.deferSetupStep("perception", false)).toMatchObject({
      ok: false,
      error: { code: "NOVA-SEC001" },
    });
    expect(application.setupSummary()).toMatchObject({
      ok: true,
      value: { current_step: "perception" },
    });
    expect(application.deferSetupStep("perception", true)).toMatchObject({
      ok: true,
      value: { current_step: "voice", deferred_steps: ["perception"] },
    });
    expect(application.setupSummary()).toMatchObject({
      ok: true,
      value: { current_step: "voice" },
    });
  });

  it("exposes only the cached high-level hardware capability summary", async () => {
    const detector = new HardwareDetector(async () => ({
      cpu_architecture: "x86_64",
      cpu_cores: 8,
      avx2: true,
      avx512: false,
      gpu_vendor: "nvidia",
      gpu_vram_gb: 12,
      gpu_accelerator: "cuda",
      system_ram_gb: 32,
      available_disk_gb: 100,
      os: "linux",
      battery_powered: false,
    }));
    await detector.scan();
    const application = new RuntimeApplication({
      configuration,
      planner: new Planner({ deterministic: new Map() }),
      executor: new Executor(
        new PermissionManager({ allowedToolIds: new Set(), confirmationTimeoutMs: 30_000 }),
        new Map(),
      ),
      verifier: new Verifier(),
      hardwareDetector: detector,
    });
    applications.push(application);

    expect(application.hardwareCapabilitySummary()).toEqual({
      ok: true,
      value: {
        scanned_at: expect.any(String),
        overall_tier: "Standard",
        recommendations: {
          llm: "local-or-cloud",
          vision: "local-or-cloud",
          speech: "local-or-cloud",
        },
      },
    });
    expect(application.hardwareCapabilitySummary()).not.toHaveProperty("value.signals");
  });

  it("rescans hardware on demand and returns only the refreshed capability summary", async () => {
    let scanCount = 0;
    const detector = new HardwareDetector(async () => {
      scanCount += 1;
      return {
        cpu_architecture: "x86_64",
        cpu_cores: 8,
        avx2: true,
        avx512: false,
        gpu_vendor: scanCount === 1 ? null : "nvidia",
        gpu_vram_gb: scanCount === 1 ? 0 : 24,
        gpu_accelerator: scanCount === 1 ? null : "cuda",
        system_ram_gb: scanCount === 1 ? 8 : 32,
        available_disk_gb: 100,
        os: "linux",
        battery_powered: false,
      };
    });
    await detector.scan();
    const application = new RuntimeApplication({
      configuration,
      planner: new Planner({ deterministic: new Map() }),
      executor: new Executor(
        new PermissionManager({ allowedToolIds: new Set(), confirmationTimeoutMs: 30_000 }),
        new Map(),
      ),
      verifier: new Verifier(),
      hardwareDetector: detector,
    });
    applications.push(application);

    const result = await application.rescanHardwareCapabilitySummary();
    expect(result).toEqual({
      ok: true,
      value: {
        scanned_at: expect.any(String),
        overall_tier: "High",
        recommendations: { llm: "local-first", vision: "local-first", speech: "local-first" },
      },
    });
    expect(result.ok && "signals" in result.value).toBe(false);
    expect(scanCount).toBe(2);
  });

  it("fails closed when hardware capability summary is unavailable", () => {
    const application = createApplication();
    applications.push(application);

    expect(application.hardwareCapabilitySummary()).toMatchObject({
      ok: false,
      error: { code: "NOVA-SEC001", retryable: true },
    });
  });

  it("fails closed when setup wizard hardware composition is unavailable", async () => {
    const application = createApplication();
    applications.push(application);

    await expect(application.startSetupWizard()).resolves.toMatchObject({
      ok: false,
      error: { code: "NOVA-SEC001", retryable: true },
    });
    expect(application.setupSummary()).toMatchObject({
      ok: false,
      error: { code: "NOVA-SEC001", retryable: true },
    });
  });

  it("delegates workspace identity, bounded locks, and recovery state", () => {
    let now = 1_000;
    const workspace = new WorkspaceManager({
      user_id: "user-1",
      workspace_id: "workspace-1",
      now: () => now,
      lockLeaseMs: 5_000,
    });
    const application = new RuntimeApplication({
      configuration,
      planner: new Planner({ deterministic: new Map() }),
      executor: new Executor(
        new PermissionManager({ allowedToolIds: new Set(), confirmationTimeoutMs: 30_000 }),
        new Map(),
      ),
      verifier: new Verifier(),
      workspaceManager: workspace,
    });
    applications.push(application);

    expect(application.workspaceIdentity()).toMatchObject({
      ok: true,
      value: { user_id: "user-1", workspace_id: "workspace-1" },
    });
    expect(application.workspaceState()).toMatchObject({ ok: true, value: "Created" });
    expect(application.activateWorkspace()).toMatchObject({ ok: true });
    const lock = application.acquireWorkspaceLock("migration");
    expect(lock).toMatchObject({ ok: true, value: { state: "Locked" } });
    expect(application.workspaceCanSync()).toMatchObject({ ok: true, value: false });
    if (lock.ok) {
      now = 6_001;
      expect(application.expireWorkspaceLock()).toMatchObject({
        ok: true,
        value: { state: "Recovering" },
      });
      expect(application.completeWorkspaceRecovery()).toMatchObject({
        ok: true,
        value: { state: "Active" },
      });
      expect(application.releaseWorkspaceLock(lock.value.token)).toMatchObject({
        ok: false,
        error: { code: "NOVA-SEC001" },
      });
    }
    expect(application.workspaceCanSync()).toMatchObject({ ok: true, value: true });
  });

  it("lists public capability records without provider implementations", () => {
    const capabilities = new CapabilityRegistry();
    capabilities.register("text-generation", {
      descriptor: {
        provider_id: "local.test",
        domain: "llm",
        privacy_class: "local",
        schema_version: "1.0.0",
        capabilities: ["text_generation"],
        cost_per_request: 0,
        latency_p50_ms: 20,
      },
      healthCheck: async () => "reachable",
      invoke: async () => ({ secret: "hidden" }),
      cancel: () => undefined,
      shutdown: () => undefined,
    });
    const application = new RuntimeApplication({
      configuration,
      planner: new Planner({ deterministic: new Map() }),
      executor: new Executor(
        new PermissionManager({ allowedToolIds: new Set(), confirmationTimeoutMs: 30_000 }),
        new Map(),
      ),
      verifier: new Verifier(),
      capabilityRegistry: capabilities,
    });
    applications.push(application);

    expect(application.listCapabilityRecords()).toEqual({
      ok: true,
      value: [
        {
          capability_id: "text-generation",
          domain: "llm",
          providers: [{ provider_id: "local.test", enabled: true, priority: 1 }],
          active_policy: { policy: "privacy-first" },
          state: "Active",
        },
      ],
    });
  });

  it("lists cached model-provider health without invoking providers", () => {
    const provider = (providerId: string): LlmProvider => ({
      descriptor: {
        provider_id: providerId,
        domain: "llm",
        privacy_class: "local",
        schema_version: "1.0.0",
        cost_per_1k_tokens: 0,
        capabilities: {
          tool_calls: true,
          vision_input: false,
          streaming: false,
          max_context_tokens: 8_192,
        },
      },
      healthCheck: async () => "reachable",
      invoke: async () => ({ text: "hidden", provider_id: providerId }),
    });
    const modelRouter = new ModelRouter([provider("zeta"), provider("alpha")]);
    const application = new RuntimeApplication({
      configuration,
      planner: new Planner({ deterministic: new Map() }),
      executor: new Executor(
        new PermissionManager({ allowedToolIds: new Set(), confirmationTimeoutMs: 30_000 }),
        new Map(),
      ),
      verifier: new Verifier(),
      modelRouter,
    });
    applications.push(application);

    expect(application.listModelProviderHealthStatuses()).toEqual({
      ok: true,
      value: [
        { provider_id: "alpha", health: "reachable" },
        { provider_id: "zeta", health: "reachable" },
      ],
    });
  });

  it("delegates privacy-safe model provider health inspection", () => {
    const provider: LlmProvider = {
      descriptor: {
        provider_id: "local-model",
        domain: "llm",
        privacy_class: "local",
        schema_version: "1.0.0",
        cost_per_1k_tokens: 0,
        capabilities: {
          tool_calls: true,
          vision_input: false,
          streaming: false,
          max_context_tokens: 8_192,
        },
      },
      healthCheck: async () => "reachable",
      invoke: async () => ({ text: "unused", provider_id: "local-model" }),
    };
    const application = new RuntimeApplication({
      configuration,
      planner: new Planner({ deterministic: new Map() }),
      executor: new Executor(
        new PermissionManager({ allowedToolIds: new Set(), confirmationTimeoutMs: 30_000 }),
        new Map(),
      ),
      verifier: new Verifier(),
      modelRouter: new ModelRouter([provider]),
    });
    applications.push(application);

    expect(application.modelProviderHealth("local-model")).toMatchObject({
      ok: true,
      value: "reachable",
    });
    expect(application.modelProviderHealth("missing-model")).toMatchObject({
      ok: true,
      value: "down",
    });
  });

  it("delegates read-only session device snapshots without exposing message content", () => {
    const sessions = new SessionContinuityManager({ now: () => 0 });
    expect(
      sessions.registerDevice("phone-1", [{ capability_id: "camera", status: "Degraded" }]),
    ).toMatchObject({
      ok: true,
    });
    const application = new RuntimeApplication({
      configuration,
      planner: new Planner({ deterministic: new Map() }),
      executor: new Executor(
        new PermissionManager({ allowedToolIds: new Set(), confirmationTimeoutMs: 30_000 }),
        new Map(),
      ),
      verifier: new Verifier(),
      sessionContinuityManager: sessions,
    });
    applications.push(application);

    expect(application.sessionDeviceSnapshots()).toMatchObject({
      ok: true,
      value: [
        {
          device_id: "phone-1",
          presence: "Online",
          capabilities: [{ capability_id: "camera", status: "Degraded" }],
        },
      ],
    });
  });

  it("summarizes permission-scoped system inventory without exposing raw application or path records", async () => {
    const inventory = new WindowsSystemInventory({
      modelStoragePath: "C:\\Nova\\models",
      grantedFilesystemScopes: ["C:\\Nova\\Documents"],
      runPowerShell: async () =>
        JSON.stringify({
          hardware: {
            cpu_architecture: "x86_64",
            cpu_cores: 16,
            avx2: true,
            avx512: false,
            gpu_vendor: "nvidia",
            gpu_vram_gb: 12,
            gpu_accelerator: "cuda",
            system_ram_gb: 32,
            available_disk_gb: 512,
            os: "windows",
            battery_powered: false,
          },
          installed_applications: [
            { name: "Chrome", version: "1.0", install_path: "C:\\Apps\\Chrome" },
          ],
          running_applications: [
            { name: "chrome", process_id: 1234, started_at: "2026-08-25T00:00:00.000Z" },
          ],
          storage: { model_storage_path: "C:\\Nova\\models", available_disk_gb: 512 },
          granted_filesystem_scopes: [
            { path: "C:\\Nova\\Documents", file_count: 4, folder_count: 2 },
          ],
        }),
    });
    const application = new RuntimeApplication({
      configuration,
      planner: new Planner({ deterministic: new Map() }),
      executor: new Executor(
        new PermissionManager({ allowedToolIds: new Set(), confirmationTimeoutMs: 30_000 }),
        new Map(),
      ),
      verifier: new Verifier(),
      systemInventory: inventory,
    });
    applications.push(application);

    const result = await application.systemInventorySummary();
    expect(result).toMatchObject({
      ok: true,
      value: {
        hardware: { cpu_cores: 16, gpu_vram_gb: 12 },
        installed_application_count: 1,
        running_application_count: 1,
        granted_filesystem_scope_count: 1,
        available_disk_gb: 512,
      },
    });
    expect(result.ok && "installed_applications" in result.value).toBe(false);
  });

  it("delegates read-only network state inspection", () => {
    const network = new NetworkDiscoveryManager({ expectedPeerKey: "peer-key", transports: [] });
    const application = new RuntimeApplication({
      configuration,
      planner: new Planner({ deterministic: new Map() }),
      executor: new Executor(
        new PermissionManager({ allowedToolIds: new Set(), confirmationTimeoutMs: 30_000 }),
        new Map(),
      ),
      verifier: new Verifier(),
      networkDiscovery: network,
    });
    applications.push(application);

    expect(application.networkState()).toMatchObject({ ok: true, value: "Disconnected" });
  });

  it("delegates read-only system lifecycle log inspection", async () => {
    const lifecycle = new SystemLifecycleOrchestrator(
      [{ name: "Ready", run: async () => ({ ok: true, value: undefined }) }],
      [{ name: "Runtime Manager Exits", run: async () => ({ ok: true, value: undefined }) }],
    );
    await lifecycle.start();
    await lifecycle.stop();
    const application = new RuntimeApplication({
      configuration,
      planner: new Planner({ deterministic: new Map() }),
      executor: new Executor(
        new PermissionManager({ allowedToolIds: new Set(), confirmationTimeoutMs: 30_000 }),
        new Map(),
      ),
      verifier: new Verifier(),
      systemLifecycle: lifecycle,
    });
    applications.push(application);

    expect(application.systemStartupLog()).toMatchObject({ ok: true, value: ["Ready"] });
    expect(application.systemShutdownLog()).toMatchObject({
      ok: true,
      value: ["Runtime Manager Exits"],
    });
  });

  it("lists scheduled-job states without running or cancelling jobs", () => {
    const jobs = new JobScheduler(new InMemoryJobStore(), {
      now: () => Date.parse("2026-08-24T10:00:00.000Z"),
    });
    jobs.register({
      job_id: "zeta",
      type: "recurring",
      schedule: "1h",
      dependencies: [],
      priority: "normal",
      concurrency_group: "background",
      idempotent: true,
    });
    jobs.register({
      job_id: "alpha",
      type: "recurring",
      schedule: "1h",
      dependencies: [],
      priority: "low",
      concurrency_group: "background",
      idempotent: true,
    });
    const application = new RuntimeApplication({
      configuration,
      planner: new Planner({ deterministic: new Map() }),
      executor: new Executor(
        new PermissionManager({ allowedToolIds: new Set(), confirmationTimeoutMs: 30_000 }),
        new Map(),
      ),
      verifier: new Verifier(),
      jobScheduler: jobs,
    });
    applications.push(application);

    expect(application.listScheduledJobStates()).toMatchObject({
      ok: true,
      value: [
        { definition: { job_id: "alpha" }, status: "scheduled" },
        { definition: { job_id: "zeta" }, status: "scheduled" },
      ],
    });
  });

  it("exposes active scheduled-job concurrency groups without mutation", async () => {
    let release: (() => void) | undefined;
    const jobs = new JobScheduler(new InMemoryJobStore(), {
      now: () => Date.parse("2026-08-24T10:00:00.000Z"),
      runner: async () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    });
    jobs.register({
      job_id: "briefing",
      type: "recurring",
      schedule: "1h",
      dependencies: [],
      priority: "low",
      concurrency_group: "background",
      idempotent: true,
    });
    const application = new RuntimeApplication({
      configuration,
      planner: new Planner({ deterministic: new Map() }),
      executor: new Executor(
        new PermissionManager({ allowedToolIds: new Set(), confirmationTimeoutMs: 30_000 }),
        new Map(),
      ),
      verifier: new Verifier(),
      jobScheduler: jobs,
    });
    applications.push(application);
    const running = jobs.runDue();
    await vi.waitFor(() =>
      expect(application.activeScheduledJobConcurrencyGroups()).toEqual({
        ok: true,
        value: ["background"],
      }),
    );
    release?.();
    await running;
  });

  it("delegates read-only scheduled-job state inspection", () => {
    const scheduler = new JobScheduler(new InMemoryJobStore(), {
      runner: async () => undefined,
      now: () => 0,
    });
    expect(
      scheduler.register({
        job_id: "briefing",
        type: "recurring",
        schedule: "1h",
        dependencies: [],
        priority: "normal",
        concurrency_group: "briefings",
        idempotent: true,
      }),
    ).toMatchObject({ ok: true, value: { status: "scheduled" } });
    const application = new RuntimeApplication({
      configuration,
      planner: new Planner({ deterministic: new Map() }),
      executor: new Executor(
        new PermissionManager({ allowedToolIds: new Set(), confirmationTimeoutMs: 30_000 }),
        new Map(),
      ),
      verifier: new Verifier(),
      jobScheduler: scheduler,
    });
    applications.push(application);

    expect(application.jobState("briefing")).toMatchObject({
      ok: true,
      value: { definition: { job_id: "briefing" }, status: "scheduled" },
    });
    expect(application.jobState("missing-job")).toMatchObject({
      ok: false,
      error: { code: "NOVA-TL004" },
    });
  });

  it("exposes bounded tool catalog summaries through the composed runtime", () => {
    const application = createApplication();
    applications.push(application);
    application.toolRegistry.register({
      tool_id: "builtin.filesystem",
      execution_tier: "native_runtime",
      deterministic: true,
      dependencies: [],
      target_entity_types: ["file"],
      supported_actions: [
        {
          action_id: "read",
          risk_tier: "read_only",
          verification_signal: "file_hash",
          lockable_resources: ["file"],
          permission_scope: "filesystem.read",
          estimated_latency_ms: 10,
          estimated_cost_class: "free",
          timeout_ms: 5_000,
          idempotent: true,
          input_schema: { type: "object" },
          output_schema: { type: "string" },
        },
      ],
    });

    expect(application.listToolSummaries()).toEqual({
      ok: true,
      value: [
        {
          tool_id: "builtin.filesystem",
          execution_tier: "native_runtime",
          deterministic: true,
          action_count: 1,
          read_only_action_count: 1,
          compensation_action_count: 0,
        },
      ],
    });
  });

  it("requires explicit confirmation before enabling an installed plugin", async () => {
    const manager = new PluginManager({
      novaApiVersion: "1.0.0",
      verify: async () => true,
      sandbox: async () => true,
      processFactory: () => ({
        start: async () => undefined,
        stop: async () => undefined,
      }),
    });
    expect(
      manager.install({
        plugin_id: "com.example.reader",
        version: "1.0.0",
        nova_api_version_range: ">=1.0.0",
        display_name: "Reader",
        description: "Read-only plugin metadata.",
        provided_tools: ["reader.read"],
        required_permissions: [],
        dependencies: [],
        entry_point: "index.js",
      }),
    ).toMatchObject({ ok: true, value: { state: "Installed" } });
    const application = new RuntimeApplication({
      configuration,
      planner: new Planner({ deterministic: new Map() }),
      executor: new Executor(
        new PermissionManager({ allowedToolIds: new Set(), confirmationTimeoutMs: 30_000 }),
        new Map(),
      ),
      verifier: new Verifier(),
      pluginManager: manager,
    });
    applications.push(application);

    expect(await application.enablePlugin("com.example.reader", false)).toMatchObject({
      ok: false,
      error: { code: "NOVA-SEC001" },
    });
    expect(application.pluginRecord("com.example.reader")).toMatchObject({
      ok: true,
      value: { state: "Installed" },
    });
    expect(await application.enablePlugin("com.example.reader", true)).toMatchObject({
      ok: true,
      value: { state: "Enabled" },
    });
    expect(await application.disablePlugin("com.example.reader", false)).toMatchObject({
      ok: false,
      error: { code: "NOVA-SEC001" },
    });
    expect(application.pluginRecord("com.example.reader")).toMatchObject({
      ok: true,
      value: { state: "Enabled" },
    });
    expect(await application.disablePlugin("com.example.reader", true)).toMatchObject({
      ok: true,
      value: { state: "Disabled" },
    });
    expect(await application.uninstallPlugin("com.example.reader", false)).toMatchObject({
      ok: false,
      error: { code: "NOVA-SEC001" },
    });
    expect(application.pluginRecord("com.example.reader")).toMatchObject({
      ok: true,
      value: { state: "Disabled" },
    });
    expect(await application.uninstallPlugin("com.example.reader", true)).toMatchObject({
      ok: true,
      value: undefined,
    });
    expect(application.pluginRecord("com.example.reader")).toMatchObject({
      ok: false,
    });
  });

  it("delegates trust-preserving plugin record inspection", () => {
    const manager = new PluginManager({ novaApiVersion: "1.0.0" });
    expect(
      manager.install({
        plugin_id: "com.example.reader",
        version: "1.0.0",
        nova_api_version_range: ">=1.0.0",
        display_name: "Reader",
        description: "Read-only plugin metadata.",
        provided_tools: ["reader.read"],
        required_permissions: ["files.read"],
        dependencies: [],
        entry_point: "index.js",
      }),
    ).toMatchObject({ ok: true, value: { state: "Installed" } });
    const application = new RuntimeApplication({
      configuration,
      planner: new Planner({ deterministic: new Map() }),
      executor: new Executor(
        new PermissionManager({ allowedToolIds: new Set(), confirmationTimeoutMs: 30_000 }),
        new Map(),
      ),
      verifier: new Verifier(),
      pluginManager: manager,
    });
    applications.push(application);

    expect(application.pluginRecord("com.example.reader")).toMatchObject({
      ok: true,
      value: { manifest: { plugin_id: "com.example.reader" }, state: "Installed" },
    });
    expect(application.pluginRecordSummaries()).toEqual({
      ok: true,
      value: [
        {
          plugin_id: "com.example.reader",
          version: "1.0.0",
          state: "Installed",
          provided_tool_count: 1,
          required_permission_count: 1,
        },
      ],
    });
    expect(application.pluginRecord("missing-plugin")).toMatchObject({
      ok: false,
      error: { code: "NOVA-PLG005" },
    });
  });

  it("delegates read-only runtime service health inspection", () => {
    const manager = new RuntimeManager({ now: () => 0 });
    const service: ServiceLifecycle = {
      start: async () => ({ ok: true, value: undefined }),
      stop: async () => ({ ok: true, value: undefined }),
      heartbeat: async () => ({
        ok: true,
        value: {
          serviceName: "memory",
          state: "Created",
          publishedAt: new Date(0).toISOString(),
        },
      }),
      health: () => ({
        state: "Healthy",
        detail: "ready",
        checkedAt: new Date(0).toISOString(),
        missedHeartbeats: 0,
      }),
    };
    expect(
      manager.register(
        {
          name: "memory",
          dependencies: [],
          critical: true,
          restartWindowMs: 300_000,
          maxImmediateRestarts: 3,
          backoffCeilingMs: 30_000,
        },
        service,
      ),
    ).toMatchObject({ ok: true });
    const application = new RuntimeApplication({
      configuration,
      planner: new Planner({ deterministic: new Map() }),
      executor: new Executor(
        new PermissionManager({ allowedToolIds: new Set(), confirmationTimeoutMs: 30_000 }),
        new Map(),
      ),
      verifier: new Verifier(),
      runtimeManager: manager,
    });
    applications.push(application);

    expect(application.runtimeServiceHealth("memory")).toMatchObject({
      ok: true,
      value: { state: "Healthy", missedHeartbeats: 0 },
    });
    expect(application.runtimeServiceHealth("missing")).toMatchObject({
      ok: true,
      value: { state: "Failed" },
    });
  });

  it("delegates pure logical-clock comparison without side effects", () => {
    const application = new RuntimeApplication({
      configuration,
      planner: new Planner({ deterministic: new Map() }),
      executor: new Executor(
        new PermissionManager({ allowedToolIds: new Set(), confirmationTimeoutMs: 30_000 }),
        new Map(),
      ),
      verifier: new Verifier(),
    });
    applications.push(application);
    const left: LogicalClockValue = { counter: 3, device_id: "device-a" };
    const right: LogicalClockValue = { counter: 3, device_id: "device-b" };

    expect(application.compareLogicalClockValues(left, right)).toEqual({
      ok: true,
      value: LogicalClock.compare(left, right),
    });
    expect(application.compareLogicalClockValues(right, left)).toMatchObject({
      ok: true,
      value: 1,
    });
  });

  it("delegates device-version compatibility evaluation without side effects", () => {
    const application = new RuntimeApplication({
      configuration,
      planner: new Planner({ deterministic: new Map() }),
      executor: new Executor(
        new PermissionManager({ allowedToolIds: new Set(), confirmationTimeoutMs: 30_000 }),
        new Map(),
      ),
      verifier: new Verifier(),
    });
    applications.push(application);

    expect(application.compareDeviceVersions("5.2.0", "5.2.0")).toEqual({
      ok: true,
      value: compareDeviceVersions("5.2.0", "5.2.0"),
    });
    expect(application.compareDeviceVersions("5.2.0", "5.3.0")).toMatchObject({
      ok: true,
      value: { compatible: true, mode: "degraded" },
    });
    expect(application.compareDeviceVersions("4.9.0", "5.0.0")).toMatchObject({
      ok: true,
      value: { compatible: false, mode: "incompatible" },
    });
  });

  it("evaluates performance budgets without side effects", () => {
    const samples: BudgetSamples = {
      chat_first_token_local_ms: [100, 120],
      memory_query_ms: [100, 200],
    };
    const application = new RuntimeApplication({
      configuration,
      planner: new Planner({ deterministic: new Map() }),
      executor: new Executor(
        new PermissionManager({ allowedToolIds: new Set(), confirmationTimeoutMs: 30_000 }),
        new Map(),
      ),
      verifier: new Verifier(),
      performanceBudgetEvaluator: new PerformanceBudgetEvaluator(),
    });
    applications.push(application);

    expect(application.evaluatePerformanceBudgets(samples)).toMatchObject({
      ok: true,
      value: {
        passed: false,
        release_blocked: true,
        violations: [{ budget: "memory_query_p95_ms" }],
      },
    });
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

  it("exposes bounded foreground scheduler status without task contents", () => {
    const scheduler = new TaskScheduler(
      { execute: async () => ({ ok: true as const, value: undefined }) },
      { maxConcurrent: 2, starvationThresholdMs: 60_000, now: () => 0 },
    );
    scheduler.enqueue("queued-task", "default", 0);
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

    expect(application.taskSchedulerStatus()).toEqual({
      ok: true,
      value: { queued_count: 1, active_count: 0, max_concurrent: 2 },
    });
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
    const pushed: string[][] = [];
    const sync = new CrossDeviceSyncManager(
      {
        pull: async () => ({ next_clock: 3, envelopes: [] }),
        push: async (envelopes) => {
          pushed.push([...envelopes]);
        },
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
    sync.applyLocal({
      change_id: "local-1",
      entity_id: "task-1",
      category: "task_state",
      logical_clock: 4,
      partition: "security",
      fields: { state: "Paused" },
    });
    expect(await application.flushDeviceSync(false)).toMatchObject({
      ok: false,
      error: { code: "NOVA-SEC001" },
    });
    expect(pushed).toEqual([]);
    expect(await application.flushDeviceSync(true)).toMatchObject({
      ok: true,
      value: { pushed_change_ids: ["local-1"] },
    });
    expect(pushed).toHaveLength(1);
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
    const completePairing = vi.spyOn(pairing, "completePairing");

    const deniedOffer = application.createPairingOffer(
      {
        runtime_mode: "Companion",
        primary_public_key: "primary",
      },
      false,
    );
    expect(deniedOffer).toMatchObject({ ok: false, error: { code: "NOVA-SEC001" } });

    const offer = application.createPairingOffer(
      {
        runtime_mode: "Companion",
        primary_public_key: "primary",
      },
      true,
    );
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
        confirmed: false,
      }),
    ).toMatchObject({ ok: false, error: { code: "NOVA-SEC001" } });
    expect(completePairing).not.toHaveBeenCalled();
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

    expect(application.revokeTrustedDevice("android-1", false)).toMatchObject({
      ok: false,
      error: { code: "NOVA-SEC001" },
    });
    expect(application.listTrustedDevices()).toHaveLength(1);
    expect(application.revokeTrustedDevice("android-1", true)).toMatchObject({ ok: true });
    expect(application.listTrustedDevices()).toEqual([]);
    expect(application.listDeviceSnapshots()).toEqual([]);
    expect(
      await remoteControl.execute("remote-session-1", {
        command_id: "command-1",
        content: "status",
        destructive: false,
      }),
    ).toMatchObject({ ok: false, error: { code: "NOVA-SEC001" } });
    expect(application.revokeTrustedDevice("android-1", true)).toMatchObject({
      ok: false,
      error: { code: "NOVA-SEC001" },
    });
  });

  it("exposes remote session status without commands or signatures", () => {
    const remoteControl = new RemoteControlManager(
      { verify: () => true, send: async () => undefined },
      { now: () => 1000, sessionTtlMs: 5_000 },
    );
    remoteControl.requestSession({
      session_id: "remote-session-1",
      initiator_device_id: "phone-1",
      signature: "signature",
    });
    const application = new RuntimeApplication({
      configuration,
      planner: new Planner({ deterministic: new Map() }),
      executor: new Executor(
        new PermissionManager({ allowedToolIds: new Set(), confirmationTimeoutMs: 30_000 }),
        new Map(),
      ),
      verifier: new Verifier(),
      remoteControlManager: remoteControl,
    });
    applications.push(application);

    expect(application.remoteControlSessionStatuses()).toEqual({
      ok: true,
      value: [
        {
          session_id: "remote-session-1",
          initiator_device_id: "phone-1",
          expires_at: 6_000,
          state: "AwaitingApproval",
        },
      ],
    });
  });

  it("exposes active remote pre-approval status without trust material", () => {
    const remoteControl = new RemoteControlManager(
      { verify: () => true, send: async () => undefined },
      { now: () => 1000 },
    );
    remoteControl.preApprove("phone-1", 2_000);
    const application = new RuntimeApplication({
      configuration,
      planner: new Planner({ deterministic: new Map() }),
      executor: new Executor(
        new PermissionManager({ allowedToolIds: new Set(), confirmationTimeoutMs: 30_000 }),
        new Map(),
      ),
      verifier: new Verifier(),
      remoteControlManager: remoteControl,
    });
    applications.push(application);

    expect(application.remoteControlPreApprovalStatuses()).toEqual({
      ok: true,
      value: [{ device_id: "phone-1", expires_at: 3_000 }],
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

  it("exposes privacy-safe webhook health through the composed application", () => {
    const application = createApplication();
    applications.push(application);
    const registration = application.webhook.register({
      url: "https://example.test/nova",
      topics: ["system.status"],
    });

    expect(application.webhookHealthSummary(registration.id)).toEqual({
      ok: true,
      value: {
        id: registration.id,
        topics: ["system.status"],
        status: "healthy",
        failure_count: 0,
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
