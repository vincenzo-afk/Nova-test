import { contextBridge, ipcRenderer } from "electron";

const novaApi = {
  submitTask: (goal: string) => ipcRenderer.invoke("nova:task:submit", { goal }),
  getTask: (taskId: string) => ipcRenderer.invoke("nova:task:get", { task_id: taskId }),
  listTasks: (limit?: number, cursor?: string) =>
    ipcRenderer.invoke("nova:task:list", { limit, cursor }),
  cancelTask: (taskId: string) => ipcRenderer.invoke("nova:task:cancel", { task_id: taskId }),
  searchMemory: (input: unknown) => ipcRenderer.invoke("nova:memory:search", input),
  getMemoryRecord: (recordId: string) =>
    ipcRenderer.invoke("nova:memory:record", { record_id: recordId }),
  queryGraph: (input: unknown) => ipcRenderer.invoke("nova:graph:query", input),
  syncDevices: () => ipcRenderer.invoke("nova:devices:sync"),
  flushDeviceSync: () => ipcRenderer.invoke("nova:devices:sync-flush"),
  getAndroidCompanionPermission: (permission: string) =>
    ipcRenderer.invoke("nova:companion:permission", permission),
  setAndroidCompanionPermission: (permission: string, granted: boolean) =>
    ipcRenderer.invoke("nova:companion:permission-set", { permission, granted }),
  checkAndroidCompanionCapability: (input: unknown) =>
    ipcRenderer.invoke("nova:companion:capability", input),
  startAndroidCompanionForegroundService: () =>
    ipcRenderer.invoke("nova:companion:foreground-start"),
  stopAndroidCompanionForegroundService: () => ipcRenderer.invoke("nova:companion:foreground-stop"),
  startAndroidCompanionBackground: (capabilityId: string) =>
    ipcRenderer.invoke("nova:companion:background-start", { capability_id: capabilityId }),
  readEmail: (query: unknown) => ipcRenderer.invoke("nova:email:read", query),
  draftEmail: (draft: unknown) => ipcRenderer.invoke("nova:email:draft", draft),
  sendEmail: (draft: unknown, confirmed: boolean) =>
    ipcRenderer.invoke("nova:email:send", { draft, confirmed }),
  upcomingCalendarEvents: () => ipcRenderer.invoke("nova:calendar:upcoming"),
  proposeCalendarEvent: (draft: unknown) => ipcRenderer.invoke("nova:calendar:propose", draft),
  createCalendarEvent: (draft: unknown, confirmed: boolean) =>
    ipcRenderer.invoke("nova:calendar:create", { draft, confirmed }),
  sendChannelMessage: (channelId: string, chatId: string, content: string) =>
    ipcRenderer.invoke("nova:channel:send", { channel_id: channelId, chat_id: chatId, content }),
  receiveChannelMessage: (channelId: string, message: unknown) =>
    ipcRenderer.invoke("nova:channel:receive", { channel_id: channelId, message }),
  getChannelMediaCapabilities: (channelId: string) =>
    ipcRenderer.invoke("nova:channel:media", channelId),
  generateBackgroundBriefing: (trigger: string) =>
    ipcRenderer.invoke("nova:background:generate", trigger),
  deliverBackgroundBriefing: (briefing: unknown) =>
    ipcRenderer.invoke("nova:background:deliver", briefing),
  proposeAdaptivePreference: (input: unknown) =>
    ipcRenderer.invoke("nova:personalization:propose", input),
  approveAdaptivePreference: (proposalId: string) =>
    ipcRenderer.invoke("nova:personalization:approve", proposalId),
  dismissAdaptivePreference: (proposalId: string) =>
    ipcRenderer.invoke("nova:personalization:dismiss", proposalId),
  pendingAdaptivePreferences: () => ipcRenderer.invoke("nova:personalization:pending"),
  resetAdaptivePreference: (preferenceId?: string) =>
    ipcRenderer.invoke("nova:personalization:reset", preferenceId),
  generatePersonalAnalytics: (input: unknown) =>
    ipcRenderer.invoke("nova:analytics:generate", input),
  detectIncident: (detail: string) => ipcRenderer.invoke("nova:incident:detect", detail),
  triageIncident: (incidentId: string, severity: string) =>
    ipcRenderer.invoke("nova:incident:triage", { incident_id: incidentId, severity }),
  mitigateIncident: (incidentId: string, detail: string) =>
    ipcRenderer.invoke("nova:incident:mitigate", { incident_id: incidentId, detail }),
  resolveIncident: (incidentId: string, detail: string) =>
    ipcRenderer.invoke("nova:incident:resolve", { incident_id: incidentId, detail }),
  postmortemIncident: (incidentId: string, detail: string) =>
    ipcRenderer.invoke("nova:incident:postmortem", { incident_id: incidentId, detail }),
  incidentTimeline: (incidentId: string) =>
    ipcRenderer.invoke("nova:incident:timeline", incidentId),
  handleRunbook: (incident: string) => ipcRenderer.invoke("nova:runbook:handle", incident),
  getCapabilityRecord: (capabilityId: string) =>
    ipcRenderer.invoke("nova:capability:get", capabilityId),
  setCapabilityProviderEnabled: (capabilityId: string, providerId: string, enabled: boolean) =>
    ipcRenderer.invoke("nova:capability:provider-enabled", {
      capability_id: capabilityId,
      provider_id: providerId,
      enabled,
    }),
  setCapabilityProviderPriority: (capabilityId: string, providerId: string, priority: number) =>
    ipcRenderer.invoke("nova:capability:provider-priority", {
      capability_id: capabilityId,
      provider_id: providerId,
      priority,
    }),
  setCapabilityPolicy: (capabilityId: string, policy: unknown) =>
    ipcRenderer.invoke("nova:capability:policy", { capability_id: capabilityId, policy }),
  discoverLocalModels: (hardware: unknown) => ipcRenderer.invoke("nova:models:discover", hardware),
  startVoicePipeline: () => ipcRenderer.invoke("nova:voice:start"),
  stopVoicePipeline: () => ipcRenderer.invoke("nova:voice:stop"),
  bargeInVoice: () => ipcRenderer.invoke("nova:voice:barge-in"),
  voicePipelineState: () => ipcRenderer.invoke("nova:voice:state"),
  discoverPluginsForGap: (gap: unknown) => ipcRenderer.invoke("nova:plugins:discover", gap),
  confirmPluginDiscovery: (pluginId: string) =>
    ipcRenderer.invoke("nova:plugins:confirm", pluginId),
  declinePluginDiscovery: (pluginId: string) =>
    ipcRenderer.invoke("nova:plugins:decline", pluginId),
  pendingPluginDiscovery: () => ipcRenderer.invoke("nova:plugins:pending"),
  createBackup: (state: unknown) => ipcRenderer.invoke("nova:backup:create", state),
  preUpdateBackup: (state: unknown) => ipcRenderer.invoke("nova:backup:pre-update", state),
  restoreBackup: (snapshotId: string) => ipcRenderer.invoke("nova:backup:restore", snapshotId),
  prepareRestore: (snapshotId: string) => ipcRenderer.invoke("nova:restore:prepare", snapshotId),
  applyPreparedRestore: (prepared: unknown, confirmed: boolean) =>
    ipcRenderer.invoke("nova:restore:apply", { prepared, confirmed }),
  upgradeRuntime: (request: unknown, confirmed: boolean) =>
    ipcRenderer.invoke("nova:upgrade:run", { request, confirmed }),
  repairRuntime: (request?: { apply: boolean }) => ipcRenderer.invoke("nova:repair:run", request),
  acquireResources: (taskId: string, resources: readonly string[]) =>
    ipcRenderer.invoke("nova:resources:acquire", { task_id: taskId, resources }),
  releaseResources: (taskId: string) => ipcRenderer.invoke("nova:resources:release", taskId),
  resourceHolder: (resource: string) => ipcRenderer.invoke("nova:resources:holder", resource),
  expireResourceLocks: () => ipcRenderer.invoke("nova:resources:expire"),
  acquireArbitratedResource: (resource: string, request: unknown) =>
    ipcRenderer.invoke("nova:resources:arbitrate", { resource, request }),
  releaseArbitratedResource: (resource: string, requestId: string) =>
    ipcRenderer.invoke("nova:resources:arbitration-release", {
      resource,
      request_id: requestId,
    }),
  createPairingOffer: (input: unknown) => ipcRenderer.invoke("nova:devices:pairing-offer", input),
  completePairing: (code: string, request: unknown) =>
    ipcRenderer.invoke("nova:devices:pairing-complete", { code, request }),
  revokeTrustedDevice: (deviceId: string) =>
    ipcRenderer.invoke("nova:devices:revoke", { device_id: deviceId }),
  getTrustedDevices: () => ipcRenderer.invoke("nova:devices:trusted"),
  getDeviceSnapshots: () => ipcRenderer.invoke("nova:devices:snapshots"),
  negotiateDeviceCapability: (deviceId: string, capabilityId: string) =>
    ipcRenderer.invoke("nova:devices:negotiate", {
      device_id: deviceId,
      capability_id: capabilityId,
    }),
  getDiagnostics: () => ipcRenderer.invoke("nova:diagnostics:get"),
  getUpdateInfo: () => ipcRenderer.invoke("nova:updates:get"),
  validateWorkflow: (draft: unknown) => ipcRenderer.invoke("nova:workflow:validate", draft),
  captureScreenshot: (request: unknown) => ipcRenderer.invoke("nova:desktop:screenshot", request),
  executeUiAction: (request: unknown) => ipcRenderer.invoke("nova:desktop:ui-action", request),
  readAccessibilityState: (request: unknown) => ipcRenderer.invoke("nova:desktop:ui-read", request),
  getPermissions: () => ipcRenderer.invoke("nova:permissions:get"),
  setPermission: (source: string, granted: boolean) =>
    ipcRenderer.invoke("nova:permissions:set", { source, granted }),
  getConfig: () => ipcRenderer.invoke("nova:config:get"),
  updateConfig: (section: string, value: unknown) =>
    ipcRenderer.invoke("nova:config:update", { section, value }),
};

contextBridge.exposeInMainWorld("nova", novaApi);
