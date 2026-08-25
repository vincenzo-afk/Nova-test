import { beforeEach, describe, expect, it, vi } from "vitest";

const exposeInMainWorld = vi.fn();
const invoke = vi.fn();

vi.mock("electron", () => ({
  contextBridge: { exposeInMainWorld },
  ipcRenderer: { invoke },
}));

describe("Electron preload boundary", () => {
  beforeEach(async () => {
    vi.resetModules();
    exposeInMainWorld.mockReset();
    invoke.mockReset();
  });

  it("exposes only the documented Nova bridge methods", async () => {
    await import("../src/preload/preload.js");

    expect(exposeInMainWorld).toHaveBeenCalledOnce();
    const [name, api] = exposeInMainWorld.mock.calls[0] as [string, Record<string, unknown>];
    expect(name).toBe("nova");
    expect(Object.keys(api)).toEqual([
      "submitTask",
      "getTask",
      "listTasks",
      "cancelTask",
      "searchMemory",
      "getMemoryRecord",
      "queryGraph",
      "syncDevices",
      "flushDeviceSync",
      "getAndroidCompanionPermission",
      "setAndroidCompanionPermission",
      "checkAndroidCompanionCapability",
      "startAndroidCompanionForegroundService",
      "stopAndroidCompanionForegroundService",
      "startAndroidCompanionBackground",
      "readEmail",
      "draftEmail",
      "sendEmail",
      "upcomingCalendarEvents",
      "proposeCalendarEvent",
      "createCalendarEvent",
      "sendChannelMessage",
      "receiveChannelMessage",
      "getChannelMediaCapabilities",
      "generateBackgroundBriefing",
      "deliverBackgroundBriefing",
      "proposeAdaptivePreference",
      "approveAdaptivePreference",
      "dismissAdaptivePreference",
      "pendingAdaptivePreferences",
      "resetAdaptivePreference",
      "generatePersonalAnalytics",
      "detectIncident",
      "triageIncident",
      "mitigateIncident",
      "resolveIncident",
      "postmortemIncident",
      "incidentTimeline",
      "handleRunbook",
      "getCapabilityRecord",
      "setCapabilityProviderEnabled",
      "setCapabilityProviderPriority",
      "setCapabilityPolicy",
      "discoverLocalModels",
      "modelProviderHealth",
      "startVoicePipeline",
      "stopVoicePipeline",
      "bargeInVoice",
      "voicePipelineState",
      "discoverPluginsForGap",
      "confirmPluginDiscovery",
      "declinePluginDiscovery",
      "pendingPluginDiscovery",
      "createBackup",
      "preUpdateBackup",
      "restoreBackup",
      "prepareRestore",
      "applyPreparedRestore",
      "upgradeRuntime",
      "repairRuntime",
      "acquireResources",
      "releaseResources",
      "resourceHolder",
      "expireResourceLocks",
      "acquireArbitratedResource",
      "releaseArbitratedResource",
      "submitOfflineAction",
      "reconnectOfflineActions",
      "startSetupWizard",
      "rerunSetupWizard",
      "completeSetupStep",
      "deferSetupStep",
      "setupSummary",
      "workspaceIdentity",
      "workspaceState",
      "createWorkspace",
      "activateWorkspace",
      "acquireWorkspaceLock",
      "releaseWorkspaceLock",
      "expireWorkspaceLock",
      "beginWorkspaceRecovery",
      "completeWorkspaceRecovery",
      "workspaceCanSync",
      "createPairingOffer",
      "completePairing",
      "revokeTrustedDevice",
      "getTrustedDevices",
      "getDeviceSnapshots",
      "negotiateDeviceCapability",
      "getDiagnostics",
      "getUpdateInfo",
      "validateWorkflow",
      "captureScreenshot",
      "executeUiAction",
      "readAccessibilityState",
      "getPermissions",
      "setPermission",
      "getConfig",
      "updateConfig",
      "evaluatePerformanceBudgets",
      "compareDeviceVersions",
      "runtimeServiceHealth",
      "pluginRecord",
      "jobState",
      "systemStartupLog",
      "systemShutdownLog",
      "compareLogicalClockValues",
      "networkState",
      "systemInventorySummary",
      "sessionDeviceSnapshots",
      "pendingAdaptivePreferenceSummaries",
      "hardwareCapabilitySummary",
      "rescanHardwareCapabilitySummary",
      "remoteControlSessionStatuses",
      "remoteControlPreApprovalStatuses",
      "listCapabilityRecords",
      "heldResourceLocks",
      "listScheduledJobStates",
      "activeScheduledJobConcurrencyGroups",
      "listModelProviderHealthStatuses",
      "reclaimableLocalModelSummaries",
      "websocketUrl",
      "restUrl",
      "webhookHealthSummary",
      "pluginRecordSummaries",
      "listToolSummaries",
      "taskSchedulerStatus",
      "workflowCheckpointSummaries",
      "retryTask",
      "resumePausedTask",
    ]);
  });

  it("forwards task and permission calls through IPC", async () => {
    await import("../src/preload/preload.js");
    const [, api] = exposeInMainWorld.mock.calls[0] as [
      string,
      {
        submitTask: (goal: string) => unknown;
        getTask: (taskId: string) => unknown;
        listTasks: (limit?: number, cursor?: string) => unknown;
        cancelTask: (taskId: string) => unknown;
        searchMemory: (input: unknown) => unknown;
        getMemoryRecord: (recordId: string) => unknown;
        queryGraph: (input: unknown) => unknown;
        syncDevices: () => unknown;
        flushDeviceSync: () => unknown;
        getAndroidCompanionPermission: (permission: string) => unknown;
        setAndroidCompanionPermission: (permission: string, granted: boolean) => unknown;
        checkAndroidCompanionCapability: (input: unknown) => unknown;
        startAndroidCompanionForegroundService: () => unknown;
        stopAndroidCompanionForegroundService: () => unknown;
        startAndroidCompanionBackground: (capabilityId: string) => unknown;
        readEmail: (query: unknown) => unknown;
        draftEmail: (draft: unknown) => unknown;
        sendEmail: (draft: unknown, confirmed: boolean) => unknown;
        upcomingCalendarEvents: () => unknown;
        proposeCalendarEvent: (draft: unknown) => unknown;
        createCalendarEvent: (draft: unknown, confirmed: boolean) => unknown;
        sendChannelMessage: (channelId: string, chatId: string, content: string) => unknown;
        receiveChannelMessage: (channelId: string, message: unknown) => unknown;
        getChannelMediaCapabilities: (channelId: string) => unknown;
        generateBackgroundBriefing: (trigger: string) => unknown;
        deliverBackgroundBriefing: (briefing: unknown) => unknown;
        proposeAdaptivePreference: (input: unknown) => unknown;
        approveAdaptivePreference: (proposalId: string) => unknown;
        dismissAdaptivePreference: (proposalId: string) => unknown;
        pendingAdaptivePreferences: () => unknown;
        resetAdaptivePreference: (preferenceId?: string) => unknown;
        generatePersonalAnalytics: (input: unknown) => unknown;
        detectIncident: (detail: string) => unknown;
        triageIncident: (incidentId: string, severity: string) => unknown;
        mitigateIncident: (incidentId: string, detail: string) => unknown;
        resolveIncident: (incidentId: string, detail: string) => unknown;
        postmortemIncident: (incidentId: string, detail: string) => unknown;
        incidentTimeline: (incidentId: string) => unknown;
        handleRunbook: (incident: string) => unknown;
        getCapabilityRecord: (capabilityId: string) => unknown;
        setCapabilityProviderEnabled: (
          capabilityId: string,
          providerId: string,
          enabled: boolean,
        ) => unknown;
        setCapabilityProviderPriority: (
          capabilityId: string,
          providerId: string,
          priority: number,
        ) => unknown;
        setCapabilityPolicy: (capabilityId: string, policy: unknown) => unknown;
        discoverLocalModels: (hardware: unknown) => unknown;
        modelProviderHealth: (providerId: string) => unknown;
        startVoicePipeline: () => unknown;
        stopVoicePipeline: () => unknown;
        bargeInVoice: () => unknown;
        voicePipelineState: () => unknown;
        discoverPluginsForGap: (gap: unknown) => unknown;
        confirmPluginDiscovery: (pluginId: string) => unknown;
        declinePluginDiscovery: (pluginId: string) => unknown;
        pendingPluginDiscovery: () => unknown;
        createBackup: (state: unknown) => unknown;
        preUpdateBackup: (state: unknown) => unknown;
        restoreBackup: (snapshotId: string) => unknown;
        prepareRestore: (snapshotId: string) => unknown;
        applyPreparedRestore: (prepared: unknown, confirmed: boolean) => unknown;
        upgradeRuntime: (request: unknown, confirmed: boolean) => unknown;
        repairRuntime: (request?: { apply: boolean }) => unknown;
        acquireResources: (taskId: string, resources: readonly string[]) => unknown;
        releaseResources: (taskId: string) => unknown;
        resourceHolder: (resource: string) => unknown;
        expireResourceLocks: () => unknown;
        acquireArbitratedResource: (resource: string, request: unknown) => unknown;
        releaseArbitratedResource: (resource: string, requestId: string) => unknown;
        submitOfflineAction: (action: unknown) => unknown;
        reconnectOfflineActions: () => unknown;
        startSetupWizard: () => unknown;
        rerunSetupWizard: () => unknown;
        completeSetupStep: (step: string, patch?: unknown) => unknown;
        deferSetupStep: (step: string) => unknown;
        setupSummary: () => unknown;
        workspaceIdentity: () => unknown;
        workspaceState: () => unknown;
        createWorkspace: (workspaceId: string) => unknown;
        activateWorkspace: () => unknown;
        acquireWorkspaceLock: (reason: string) => unknown;
        releaseWorkspaceLock: (token: string) => unknown;
        expireWorkspaceLock: () => unknown;
        beginWorkspaceRecovery: () => unknown;
        completeWorkspaceRecovery: () => unknown;
        workspaceCanSync: () => unknown;
        createPairingOffer: (input: unknown) => unknown;
        completePairing: (code: string, request: unknown) => unknown;
        revokeTrustedDevice: (deviceId: string) => unknown;
        getTrustedDevices: () => unknown;
        getDeviceSnapshots: () => unknown;
        negotiateDeviceCapability: (deviceId: string, capabilityId: string) => unknown;
        getDiagnostics: () => unknown;
        getUpdateInfo: () => unknown;
        validateWorkflow: (draft: unknown) => unknown;
        captureScreenshot: (request: unknown) => unknown;
        executeUiAction: (request: unknown) => unknown;
        readAccessibilityState: (request: unknown) => unknown;
        getPermissions: () => unknown;
        setPermission: (source: string, granted: boolean) => unknown;
        getConfig: () => unknown;
        updateConfig: (section: string, value: unknown) => unknown;
        evaluatePerformanceBudgets: (samples: unknown) => unknown;
        compareDeviceVersions: (left: string, right: string) => unknown;
        runtimeServiceHealth: (serviceName: string) => unknown;
        pluginRecord: (pluginId: string) => unknown;
        jobState: (jobId: string) => unknown;
        systemStartupLog: () => unknown;
        systemShutdownLog: () => unknown;
        compareLogicalClockValues: (left: unknown, right: unknown) => unknown;
        networkState: () => unknown;
        systemInventorySummary: () => unknown;
        sessionDeviceSnapshots: () => unknown;
        pendingAdaptivePreferenceSummaries: () => unknown;
        hardwareCapabilitySummary: () => unknown;
        rescanHardwareCapabilitySummary: () => unknown;
        remoteControlSessionStatuses: () => unknown;
        remoteControlPreApprovalStatuses: () => unknown;
        listCapabilityRecords: () => unknown;
        heldResourceLocks: () => unknown;
        listScheduledJobStates: () => unknown;
        activeScheduledJobConcurrencyGroups: () => unknown;
        listModelProviderHealthStatuses: () => unknown;
        reclaimableLocalModelSummaries: () => unknown;
        websocketUrl: () => unknown;
        restUrl: () => unknown;
        webhookHealthSummary: (webhookId: string) => unknown;
        pluginRecordSummaries: () => unknown;
        listToolSummaries: () => unknown;
        taskSchedulerStatus: () => unknown;
        workflowCheckpointSummaries: (workflowId: string) => unknown;
        retryTask: (taskId: string, confirmed: boolean) => unknown;
        resumePausedTask: (taskId: string, confirmed: boolean) => unknown;
      },
    ];

    api.submitTask("read README");
    api.getTask("task-1");
    api.listTasks(25, "cursor-1");
    api.cancelTask("task-1");
    api.searchMemory({ query: "deployment", filters: { project: "nova" } });
    api.getMemoryRecord("memory-1");
    api.queryGraph({ node_id: "file-1", direction: "out", depth: 1 });
    api.syncDevices();
    api.flushDeviceSync();
    api.getAndroidCompanionPermission("camera");
    api.setAndroidCompanionPermission("camera", true);
    api.checkAndroidCompanionCapability({
      capability_id: "camera.capture",
      required_permissions: ["camera"],
    });
    api.startAndroidCompanionForegroundService();
    api.stopAndroidCompanionForegroundService();
    api.startAndroidCompanionBackground("camera.capture");
    api.readEmail({ from: "alice@example.com" });
    api.draftEmail({ to: "bob@example.com", subject: "Update", body: "Complete." });
    api.sendEmail({ to: "bob@example.com", subject: "Update", body: "Complete." }, true);
    api.upcomingCalendarEvents();
    api.proposeCalendarEvent({
      title: "Planning",
      start: 100,
      end: 200,
      attendees: [],
      owner: true,
    });
    api.createCalendarEvent(
      { title: "Planning", start: 100, end: 200, attendees: [], owner: true },
      true,
    );
    api.sendChannelMessage("telegram", "chat-1", "hello");
    api.receiveChannelMessage("telegram", {
      sender_id: "user-1",
      chat_id: "chat-1",
      text: "hello",
      attachments: [],
    });
    api.getChannelMediaCapabilities("telegram");
    api.generateBackgroundBriefing("explicit-request");
    api.deliverBackgroundBriefing({
      trigger: "explicit-request",
      items: [],
    });
    api.proposeAdaptivePreference({
      id: "email.concise",
      category: "tool-default",
      value: { style: "concise" },
    });
    api.approveAdaptivePreference("email.concise");
    api.dismissAdaptivePreference("email.concise");
    api.pendingAdaptivePreferences();
    api.resetAdaptivePreference("email.concise");
    api.generatePersonalAnalytics({
      period: { from: "2026-08-01T00:00:00.000Z", to: "2026-09-01T00:00:00.000Z" },
      activity: [],
      tasks: [],
      provider_usage: [],
      communications: [],
    });
    api.detectIncident("Provider unavailable.");
    api.triageIncident("inc-1", "High");
    api.mitigateIncident("inc-1", "Switched to local provider.");
    api.resolveIncident("inc-1", "Provider recovered.");
    api.postmortemIncident("inc-1", "Added a health-check fallback.");
    api.incidentTimeline("inc-1");
    api.handleRunbook("provider-down");
    api.getCapabilityRecord("llm");
    api.setCapabilityProviderEnabled("llm", "local-llm", false);
    api.setCapabilityProviderPriority("llm", "local-llm", 0);
    api.setCapabilityPolicy("llm", { policy: "manual", manual_override: "local-llm" });
    api.discoverLocalModels({
      scanned_at: "2026-08-25T00:00:00.000Z",
      signals: {},
      overall_tier: "Standard",
      recommendations: {},
    });
    api.modelProviderHealth("local-model");
    api.startVoicePipeline();
    api.stopVoicePipeline();
    api.bargeInVoice();
    api.voicePipelineState();
    api.discoverPluginsForGap({
      capability_id: "calendar",
      domain: "calendar",
      enabled_provider_count: 0,
    });
    api.confirmPluginDiscovery("com.example.calendar");
    api.declinePluginDiscovery("com.example.other");
    api.pendingPluginDiscovery();
    api.createBackup({ theme: "dark" });
    api.preUpdateBackup({ theme: "dark" });
    api.restoreBackup("snapshot-1");
    api.prepareRestore("snapshot-1");
    api.applyPreparedRestore({ verified: true, staging: { theme: "dark" } }, true);
    api.upgradeRuntime({ current_version: 1, target_version: 2 }, true);
    api.repairRuntime({ apply: false });
    api.acquireResources("task-1", ["gpu"]);
    api.releaseResources("task-1");
    api.resourceHolder("gpu");
    api.expireResourceLocks();
    api.acquireArbitratedResource("microphone", {
      request_id: "remote-1",
      origin: "remote",
    });
    api.releaseArbitratedResource("microphone", "remote-1");
    api.submitOfflineAction({ action_id: "remote-1", description: "sync" });
    api.reconnectOfflineActions();
    api.startSetupWizard();
    api.rerunSetupWizard();
    api.completeSetupStep("core-llm", { section: "capabilities", value: {} });
    api.deferSetupStep("perception");
    api.setupSummary();
    api.workspaceIdentity();
    api.workspaceState();
    api.createWorkspace("workspace-1");
    api.activateWorkspace();
    api.acquireWorkspaceLock("migration");
    api.releaseWorkspaceLock("lock-1");
    api.expireWorkspaceLock();
    api.beginWorkspaceRecovery();
    api.completeWorkspaceRecovery();
    api.workspaceCanSync();
    api.createPairingOffer({ runtime_mode: "Companion", primary_public_key: "primary" });
    api.completePairing("PAIR-1", {
      device_id: "phone-1",
      device_public_key: "public-key",
      challenge: "challenge",
      signature: "signature",
      runtime_mode: "Companion",
      confirmed: true,
    });
    api.revokeTrustedDevice("phone-1");
    api.getTrustedDevices();
    api.getDeviceSnapshots();
    api.negotiateDeviceCapability("phone-1", "camera");
    api.getDiagnostics();
    api.getUpdateInfo();
    api.validateWorkflow({ workflow_id: "workflow-1" });
    api.captureScreenshot({ task_id: "task-1", target: "focused-window", max_bytes: 1048576 });
    api.executeUiAction({
      task_id: "task-1",
      action_id: "save-note",
      action: "invoke",
      risk_tier: "reversible_write",
      expected_window_id: "hwnd:2A",
      target: { name: "Save", control_type: "button" },
    });
    api.readAccessibilityState({
      task_id: "task-1",
      expected_window_id: "hwnd:2A",
      target: { name: "Save", control_type: "button" },
    });
    api.getPermissions();
    api.setPermission("filesystem", true);
    api.getConfig();
    api.updateConfig("personalization", { preferences: [] });
    api.evaluatePerformanceBudgets({
      chat_first_token_local_ms: [100, 120],
      memory_query_ms: [100, 200],
    });
    api.compareDeviceVersions("5.2.0", "5.2.0");
    api.runtimeServiceHealth("memory");
    api.pluginRecord("com.example.reader");
    api.jobState("briefing");
    api.systemStartupLog();
    api.systemShutdownLog();
    api.compareLogicalClockValues(
      { counter: 3, device_id: "device-a" },
      { counter: 3, device_id: "device-b" },
    );
    api.networkState();
    api.systemInventorySummary();
    api.sessionDeviceSnapshots();
    api.pendingAdaptivePreferenceSummaries();
    api.hardwareCapabilitySummary();
    api.rescanHardwareCapabilitySummary();
    api.remoteControlSessionStatuses();
    api.remoteControlPreApprovalStatuses();
    api.listCapabilityRecords();
    api.heldResourceLocks();
    api.listScheduledJobStates();
    api.activeScheduledJobConcurrencyGroups();
    api.listModelProviderHealthStatuses();
    api.reclaimableLocalModelSummaries();
    api.websocketUrl();
    api.restUrl();
    api.webhookHealthSummary("webhook-1");
    api.pluginRecordSummaries();
    api.listToolSummaries();
    api.taskSchedulerStatus();
    api.workflowCheckpointSummaries("workflow-1");
    api.retryTask("task-1", true);
    api.resumePausedTask("task-1", true);

    expect(invoke).toHaveBeenNthCalledWith(1, "nova:task:submit", { goal: "read README" });
    expect(invoke).toHaveBeenNthCalledWith(2, "nova:task:get", { task_id: "task-1" });
    expect(invoke).toHaveBeenNthCalledWith(3, "nova:task:list", { limit: 25, cursor: "cursor-1" });
    expect(invoke).toHaveBeenNthCalledWith(4, "nova:task:cancel", { task_id: "task-1" });
    expect(invoke).toHaveBeenNthCalledWith(5, "nova:memory:search", {
      query: "deployment",
      filters: { project: "nova" },
    });
    expect(invoke).toHaveBeenNthCalledWith(6, "nova:memory:record", {
      record_id: "memory-1",
    });
    expect(invoke).toHaveBeenNthCalledWith(7, "nova:graph:query", {
      node_id: "file-1",
      direction: "out",
      depth: 1,
    });
    expect(invoke).toHaveBeenNthCalledWith(8, "nova:devices:sync");
    expect(invoke).toHaveBeenNthCalledWith(9, "nova:devices:sync-flush");
    expect(invoke).toHaveBeenNthCalledWith(10, "nova:companion:permission", "camera");
    expect(invoke).toHaveBeenNthCalledWith(11, "nova:companion:permission-set", {
      permission: "camera",
      granted: true,
    });
    expect(invoke).toHaveBeenNthCalledWith(12, "nova:companion:capability", {
      capability_id: "camera.capture",
      required_permissions: ["camera"],
    });
    expect(invoke).toHaveBeenNthCalledWith(13, "nova:companion:foreground-start");
    expect(invoke).toHaveBeenNthCalledWith(14, "nova:companion:foreground-stop");
    expect(invoke).toHaveBeenNthCalledWith(15, "nova:companion:background-start", {
      capability_id: "camera.capture",
    });
    expect(invoke).toHaveBeenNthCalledWith(16, "nova:email:read", { from: "alice@example.com" });
    expect(invoke).toHaveBeenNthCalledWith(17, "nova:email:draft", {
      to: "bob@example.com",
      subject: "Update",
      body: "Complete.",
    });
    expect(invoke).toHaveBeenNthCalledWith(18, "nova:email:send", {
      draft: { to: "bob@example.com", subject: "Update", body: "Complete." },
      confirmed: true,
    });
    expect(invoke).toHaveBeenNthCalledWith(19, "nova:calendar:upcoming");
    expect(invoke).toHaveBeenNthCalledWith(20, "nova:calendar:propose", {
      title: "Planning",
      start: 100,
      end: 200,
      attendees: [],
      owner: true,
    });
    expect(invoke).toHaveBeenNthCalledWith(21, "nova:calendar:create", {
      draft: { title: "Planning", start: 100, end: 200, attendees: [], owner: true },
      confirmed: true,
    });
    expect(invoke).toHaveBeenNthCalledWith(22, "nova:channel:send", {
      channel_id: "telegram",
      chat_id: "chat-1",
      content: "hello",
    });
    expect(invoke).toHaveBeenNthCalledWith(23, "nova:channel:receive", {
      channel_id: "telegram",
      message: {
        sender_id: "user-1",
        chat_id: "chat-1",
        text: "hello",
        attachments: [],
      },
    });
    expect(invoke).toHaveBeenNthCalledWith(24, "nova:channel:media", "telegram");
    expect(invoke).toHaveBeenNthCalledWith(25, "nova:background:generate", "explicit-request");
    expect(invoke).toHaveBeenNthCalledWith(26, "nova:background:deliver", {
      trigger: "explicit-request",
      items: [],
    });
    expect(invoke).toHaveBeenNthCalledWith(27, "nova:personalization:propose", {
      id: "email.concise",
      category: "tool-default",
      value: { style: "concise" },
    });
    expect(invoke).toHaveBeenNthCalledWith(28, "nova:personalization:approve", "email.concise");
    expect(invoke).toHaveBeenNthCalledWith(29, "nova:personalization:dismiss", "email.concise");
    expect(invoke).toHaveBeenNthCalledWith(30, "nova:personalization:pending");
    expect(invoke).toHaveBeenNthCalledWith(31, "nova:personalization:reset", "email.concise");
    expect(invoke).toHaveBeenNthCalledWith(32, "nova:analytics:generate", {
      period: { from: "2026-08-01T00:00:00.000Z", to: "2026-09-01T00:00:00.000Z" },
      activity: [],
      tasks: [],
      provider_usage: [],
      communications: [],
    });
    expect(invoke).toHaveBeenNthCalledWith(33, "nova:incident:detect", "Provider unavailable.");
    expect(invoke).toHaveBeenNthCalledWith(34, "nova:incident:triage", {
      incident_id: "inc-1",
      severity: "High",
    });
    expect(invoke).toHaveBeenNthCalledWith(35, "nova:incident:mitigate", {
      incident_id: "inc-1",
      detail: "Switched to local provider.",
    });
    expect(invoke).toHaveBeenNthCalledWith(36, "nova:incident:resolve", {
      incident_id: "inc-1",
      detail: "Provider recovered.",
    });
    expect(invoke).toHaveBeenNthCalledWith(37, "nova:incident:postmortem", {
      incident_id: "inc-1",
      detail: "Added a health-check fallback.",
    });
    expect(invoke).toHaveBeenNthCalledWith(38, "nova:incident:timeline", "inc-1");
    expect(invoke).toHaveBeenNthCalledWith(39, "nova:runbook:handle", "provider-down");
    expect(invoke).toHaveBeenNthCalledWith(40, "nova:capability:get", "llm");
    expect(invoke).toHaveBeenNthCalledWith(41, "nova:capability:provider-enabled", {
      capability_id: "llm",
      provider_id: "local-llm",
      enabled: false,
    });
    expect(invoke).toHaveBeenNthCalledWith(42, "nova:capability:provider-priority", {
      capability_id: "llm",
      provider_id: "local-llm",
      priority: 0,
    });
    expect(invoke).toHaveBeenNthCalledWith(43, "nova:capability:policy", {
      capability_id: "llm",
      policy: { policy: "manual", manual_override: "local-llm" },
    });
    expect(invoke).toHaveBeenNthCalledWith(44, "nova:models:discover", {
      scanned_at: "2026-08-25T00:00:00.000Z",
      signals: {},
      overall_tier: "Standard",
      recommendations: {},
    });
    expect(invoke).toHaveBeenNthCalledWith(45, "nova:models:health", "local-model");
    expect(invoke).toHaveBeenNthCalledWith(46, "nova:voice:start");
    expect(invoke).toHaveBeenNthCalledWith(47, "nova:voice:stop");
    expect(invoke).toHaveBeenNthCalledWith(48, "nova:voice:barge-in");
    expect(invoke).toHaveBeenNthCalledWith(49, "nova:voice:state");
    expect(invoke).toHaveBeenNthCalledWith(50, "nova:plugins:discover", {
      capability_id: "calendar",
      domain: "calendar",
      enabled_provider_count: 0,
    });
    expect(invoke).toHaveBeenNthCalledWith(51, "nova:plugins:confirm", "com.example.calendar");
    expect(invoke).toHaveBeenNthCalledWith(52, "nova:plugins:decline", "com.example.other");
    expect(invoke).toHaveBeenNthCalledWith(53, "nova:plugins:pending");
    expect(invoke).toHaveBeenNthCalledWith(54, "nova:backup:create", { theme: "dark" });
    expect(invoke).toHaveBeenNthCalledWith(55, "nova:backup:pre-update", { theme: "dark" });
    expect(invoke).toHaveBeenNthCalledWith(56, "nova:backup:restore", "snapshot-1");
    expect(invoke).toHaveBeenNthCalledWith(57, "nova:restore:prepare", "snapshot-1");
    expect(invoke).toHaveBeenNthCalledWith(58, "nova:restore:apply", {
      prepared: { verified: true, staging: { theme: "dark" } },
      confirmed: true,
    });
    expect(invoke).toHaveBeenNthCalledWith(59, "nova:upgrade:run", {
      request: { current_version: 1, target_version: 2 },
      confirmed: true,
    });
    expect(invoke).toHaveBeenNthCalledWith(60, "nova:repair:run", { apply: false });
    expect(invoke).toHaveBeenNthCalledWith(61, "nova:resources:acquire", {
      task_id: "task-1",
      resources: ["gpu"],
    });
    expect(invoke).toHaveBeenNthCalledWith(62, "nova:resources:release", "task-1");
    expect(invoke).toHaveBeenNthCalledWith(63, "nova:resources:holder", "gpu");
    expect(invoke).toHaveBeenNthCalledWith(64, "nova:resources:expire");
    expect(invoke).toHaveBeenNthCalledWith(65, "nova:resources:arbitrate", {
      resource: "microphone",
      request: { request_id: "remote-1", origin: "remote" },
    });
    expect(invoke).toHaveBeenNthCalledWith(66, "nova:resources:arbitration-release", {
      resource: "microphone",
      request_id: "remote-1",
    });
    expect(invoke).toHaveBeenNthCalledWith(67, "nova:offline:submit", {
      action_id: "remote-1",
      description: "sync",
    });
    expect(invoke).toHaveBeenNthCalledWith(68, "nova:offline:reconnect");
    expect(invoke).toHaveBeenNthCalledWith(69, "nova:setup:start");
    expect(invoke).toHaveBeenNthCalledWith(70, "nova:setup:rerun");
    expect(invoke).toHaveBeenNthCalledWith(71, "nova:setup:complete", {
      step: "core-llm",
      patch: { section: "capabilities", value: {} },
    });
    expect(invoke).toHaveBeenNthCalledWith(72, "nova:setup:defer", "perception");
    expect(invoke).toHaveBeenNthCalledWith(73, "nova:setup:summary");
    expect(invoke).toHaveBeenNthCalledWith(74, "nova:workspace:identity");
    expect(invoke).toHaveBeenNthCalledWith(75, "nova:workspace:state");
    expect(invoke).toHaveBeenNthCalledWith(76, "nova:workspace:create", "workspace-1");
    expect(invoke).toHaveBeenNthCalledWith(77, "nova:workspace:activate");
    expect(invoke).toHaveBeenNthCalledWith(78, "nova:workspace:acquire-lock", "migration");
    expect(invoke).toHaveBeenNthCalledWith(79, "nova:workspace:release-lock", "lock-1");
    expect(invoke).toHaveBeenNthCalledWith(80, "nova:workspace:expire-lock");
    expect(invoke).toHaveBeenNthCalledWith(81, "nova:workspace:begin-recovery");
    expect(invoke).toHaveBeenNthCalledWith(82, "nova:workspace:complete-recovery");
    expect(invoke).toHaveBeenNthCalledWith(83, "nova:workspace:can-sync");
    expect(invoke).toHaveBeenNthCalledWith(84, "nova:devices:pairing-offer", {
      runtime_mode: "Companion",
      primary_public_key: "primary",
    });
    expect(invoke).toHaveBeenNthCalledWith(85, "nova:devices:pairing-complete", {
      code: "PAIR-1",
      request: {
        device_id: "phone-1",
        device_public_key: "public-key",
        challenge: "challenge",
        signature: "signature",
        runtime_mode: "Companion",
        confirmed: true,
      },
    });
    expect(invoke).toHaveBeenNthCalledWith(86, "nova:devices:revoke", {
      device_id: "phone-1",
    });
    expect(invoke).toHaveBeenNthCalledWith(87, "nova:devices:trusted");
    expect(invoke).toHaveBeenNthCalledWith(88, "nova:devices:snapshots");
    expect(invoke).toHaveBeenNthCalledWith(89, "nova:devices:negotiate", {
      device_id: "phone-1",
      capability_id: "camera",
    });
    expect(invoke).toHaveBeenNthCalledWith(90, "nova:diagnostics:get");
    expect(invoke).toHaveBeenNthCalledWith(91, "nova:updates:get");
    expect(invoke).toHaveBeenNthCalledWith(92, "nova:workflow:validate", {
      workflow_id: "workflow-1",
    });
    expect(invoke).toHaveBeenNthCalledWith(93, "nova:desktop:screenshot", {
      task_id: "task-1",
      target: "focused-window",
      max_bytes: 1048576,
    });
    expect(invoke).toHaveBeenNthCalledWith(94, "nova:desktop:ui-action", {
      task_id: "task-1",
      action_id: "save-note",
      action: "invoke",
      risk_tier: "reversible_write",
      expected_window_id: "hwnd:2A",
      target: { name: "Save", control_type: "button" },
    });
    expect(invoke).toHaveBeenNthCalledWith(95, "nova:desktop:ui-read", {
      task_id: "task-1",
      expected_window_id: "hwnd:2A",
      target: { name: "Save", control_type: "button" },
    });
    expect(invoke).toHaveBeenNthCalledWith(96, "nova:permissions:get");
    expect(invoke).toHaveBeenNthCalledWith(97, "nova:permissions:set", {
      source: "filesystem",
      granted: true,
    });
    expect(invoke).toHaveBeenNthCalledWith(98, "nova:config:get");
    expect(invoke).toHaveBeenNthCalledWith(99, "nova:config:update", {
      section: "personalization",
      value: { preferences: [] },
    });
    expect(invoke).toHaveBeenNthCalledWith(100, "nova:performance:budgets", {
      chat_first_token_local_ms: [100, 120],
      memory_query_ms: [100, 200],
    });
    expect(invoke).toHaveBeenNthCalledWith(101, "nova:devices:compatibility", "5.2.0", "5.2.0");
    expect(invoke).toHaveBeenNthCalledWith(102, "nova:runtime:service-health", "memory");
    expect(invoke).toHaveBeenNthCalledWith(103, "nova:plugins:record", "com.example.reader");
    expect(invoke).toHaveBeenNthCalledWith(104, "nova:jobs:state", "briefing");
    expect(invoke).toHaveBeenNthCalledWith(105, "nova:system:startup-log");
    expect(invoke).toHaveBeenNthCalledWith(106, "nova:system:shutdown-log");
    expect(invoke).toHaveBeenNthCalledWith(
      107,
      "nova:devices:logical-clock-compare",
      { counter: 3, device_id: "device-a" },
      { counter: 3, device_id: "device-b" },
    );
    expect(invoke).toHaveBeenNthCalledWith(108, "nova:network:state");
    expect(invoke).toHaveBeenNthCalledWith(109, "nova:system:inventory-summary");
    expect(invoke).toHaveBeenNthCalledWith(110, "nova:session:devices");
    expect(invoke).toHaveBeenNthCalledWith(111, "nova:personalization:pending-summaries");
    expect(invoke).toHaveBeenNthCalledWith(112, "nova:hardware:summary");
    expect(invoke).toHaveBeenNthCalledWith(113, "nova:hardware:rescan-summary");
    expect(invoke).toHaveBeenNthCalledWith(114, "nova:remote:sessions");
    expect(invoke).toHaveBeenNthCalledWith(115, "nova:remote:pre-approvals");
    expect(invoke).toHaveBeenNthCalledWith(116, "nova:capability:list");
    expect(invoke).toHaveBeenNthCalledWith(117, "nova:resources:held");
    expect(invoke).toHaveBeenNthCalledWith(118, "nova:jobs:list");
    expect(invoke).toHaveBeenNthCalledWith(119, "nova:jobs:active-groups");
    expect(invoke).toHaveBeenNthCalledWith(120, "nova:models:health-list");
    expect(invoke).toHaveBeenNthCalledWith(121, "nova:models:reclaimable");
    expect(invoke).toHaveBeenNthCalledWith(122, "nova:websocket:url");
    expect(invoke).toHaveBeenNthCalledWith(123, "nova:rest:url");
    expect(invoke).toHaveBeenNthCalledWith(124, "nova:webhook:health", { webhook_id: "webhook-1" });
    expect(invoke).toHaveBeenNthCalledWith(125, "nova:plugins:list");
    expect(invoke).toHaveBeenNthCalledWith(126, "nova:tools:list");
    expect(invoke).toHaveBeenNthCalledWith(127, "nova:task-scheduler:status");
    expect(invoke).toHaveBeenNthCalledWith(128, "nova:workflow:checkpoints", {
      workflow_id: "workflow-1",
    });
    expect(invoke).toHaveBeenNthCalledWith(129, "nova:task:retry", {
      task_id: "task-1",
      confirmed: true,
    });
    expect(invoke).toHaveBeenNthCalledWith(130, "nova:task:resume-paused", {
      task_id: "task-1",
      confirmed: true,
    });
  });
});
