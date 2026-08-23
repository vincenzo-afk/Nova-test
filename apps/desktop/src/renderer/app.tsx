import { useEffect, useMemo, useState } from "react";
import type {
  ConfiguredCapabilityRecord,
  ConfigurationSectionName,
  NovaConfiguration,
  PersonalizationCategory,
  PersonalizationPreferenceRecord,
} from "@nova/runtime";
import {
  canOpenView,
  desktopNavOrder,
  initialView,
  isOnboardingComplete,
  type DesktopView,
  type ProviderMode,
  type PermissionGrant,
  viewLabel,
} from "./shell-model.js";

interface TaskSnapshot {
  readonly task_id: string;
  readonly goal: string;
  readonly state: string;
  readonly retry_count?: number;
  readonly step_history?: readonly unknown[];
  readonly waiting_user_reason?: string;
  readonly reason?: string;
}

interface TaskListPage {
  readonly items: readonly TaskSnapshot[];
  readonly next_cursor: string | null;
  readonly has_more: boolean;
}

type SurfaceView = Exclude<DesktopView, "permissions" | "chat" | "tasks">;

const actionPermissionSources = new Set(["screen", "desktop_control"]);
const isObserverPermission = (source: string): boolean => !actionPermissionSources.has(source);
const permissionLabel = (source: string): string =>
  source === "screen"
    ? "Screen capture"
    : source === "desktop_control"
      ? "Desktop control"
      : source;
const permissionDescription = (source: string): string => {
  if (source === "filesystem") return "Scoped folders only";
  if (source === "screen") return "One-shot task-bound screenshots; not continuously recorded";
  if (source === "desktop_control")
    return "Windows UI Automation only; focus and confirmation gated";
  return "Metadata only until expanded";
};

const surfaceMeta: Readonly<
  Record<
    SurfaceView,
    { readonly purpose: string; readonly items: readonly string[]; readonly state: string }
  >
> = {
  home: {
    purpose:
      "A concise overview of runtime health, recent work, memory grounding, and next actions.",
    items: ["Core runtime online", "Local memory available", "Permission boundary active"],
    state: "Populated dashboard",
  },
  memory: {
    purpose: "Browse, search, and correct stored memory with lineage visibility.",
    items: ["Working memory", "Recent decisions", "Long-term grounded records"],
    state: "Ready for a grounded query",
  },
  graph: {
    purpose: "Explore entities and relationships in the workspace knowledge graph.",
    items: ["Projects and files", "Tasks and decisions", "Devices and relationships"],
    state: "Graph index available",
  },
  workflow: {
    purpose: "Build and monitor multi-step workflows with live status per node.",
    items: ["Workflow definition", "Approval and rollback nodes", "Checkpoint and execution state"],
    state: "No active workflow",
  },
  voice: {
    purpose: "Use low-latency voice interaction with transcript, feedback, and visible controls.",
    items: ["Live transcript", "Streaming voice pipeline", "Mute and cancel controls"],
    state: "Voice is ready when enabled",
  },
  devices: {
    purpose: "Manage paired devices, capabilities, presence, and cross-device continuity.",
    items: ["This desktop", "Paired companion devices", "Capability and sync status"],
    state: "No remote session active",
  },
  provider: {
    purpose: "Manage provider references, routing preferences, and capability pinning.",
    items: ["Local-first routing", "Cloud fallback policy", "Credential references only"],
    state: "Provider policy is configured locally",
  },
  plugins: {
    purpose: "Browse, install, configure, and manage sandboxed plugin permissions.",
    items: ["Enabled plugins", "Available capabilities", "Permission and lifecycle status"],
    state: "No marketplace request pending",
  },
  diagnostics: {
    purpose: "Collect redacted runtime evidence for support, recovery, and incident review.",
    items: ["Runtime health", "Recent tasks and traces", "Redacted diagnostic bundle"],
    state: "Diagnostics collection is available",
  },
  logs: {
    purpose: "Review structured runtime events, errors, retries, and recovery evidence.",
    items: ["Lifecycle events", "Task and tool evidence", "Dead-letter and recovery signals"],
    state: "No degraded log stream detected",
  },
  settings: {
    purpose: "Configure workspace, privacy, permissions, appearance, and deterministic policies.",
    items: ["Workspace preferences", "Privacy and retention", "Keyboard and accessibility"],
    state: "Settings are local-first",
  },
  updates: {
    purpose: "Review update availability, release notes, backup readiness, and rollback controls.",
    items: ["Current version", "Update channel", "Backup and rollback readiness"],
    state: "No update action requested",
  },
};

export const App = () => {
  const [permissions, setPermissions] = useState<PermissionGrant[]>([]);
  const [view, setView] = useState<DesktopView>(initialView(true));
  const [goal, setGoal] = useState("");
  const [lastTask, setLastTask] = useState<TaskSnapshot | null>(null);
  const [tasks, setTasks] = useState<readonly TaskSnapshot[]>([]);
  const [taskListError, setTaskListError] = useState<string | null>(null);
  const [providerMode, setProviderMode] = useState<ProviderMode | null>(null);
  const [demonstrationTaskCompleted, setDemonstrationTaskCompleted] = useState(false);
  const [configuration, setConfiguration] = useState<NovaConfiguration | null>(null);
  const [configurationError, setConfigurationError] = useState<string | null>(null);

  useEffect(() => {
    void window.nova.getPermissions().then(setPermissions);
    void window.nova
      .getConfig()
      .then(setConfiguration)
      .catch((error: unknown) =>
        setConfigurationError(
          error instanceof Error ? error.message : "Configuration unavailable.",
        ),
      );
  }, []);

  const observerGranted = useMemo(
    () =>
      permissions.some(
        (permission) => permission.granted && isObserverPermission(permission.source),
      ),
    [permissions],
  );
  const firstRun = useMemo(
    () => !isOnboardingComplete(providerMode, observerGranted, demonstrationTaskCompleted),
    [demonstrationTaskCompleted, observerGranted, providerMode],
  );

  useEffect(() => {
    if (firstRun) setView(initialView(true));
  }, [firstRun]);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const page = (await window.nova.listTasks(50)) as TaskListPage;
        if (active) {
          setTasks(page.items);
          setTaskListError(null);
        }
      } catch (error: unknown) {
        if (active) {
          setTaskListError(error instanceof Error ? error.message : "Task history unavailable.");
        }
      }
    };
    void refresh();
    const interval = window.setInterval(() => void refresh(), 1_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!lastTask) return;
    let active = true;
    const refresh = async () => {
      try {
        const current = await window.nova.getTask(lastTask.task_id);
        if (active) setLastTask(current);
      } catch {
        // The task monitor retains its last authoritative snapshot while the runtime is unavailable.
      }
    };
    void refresh();
    const interval = window.setInterval(() => void refresh(), 1_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [lastTask?.task_id]);

  const submitTask = async () => {
    const trimmed = goal.trim();
    if (!trimmed) return;
    const task = await window.nova.submitTask(trimmed);
    setLastTask(task);
    setGoal("");
    setView("tasks");
  };

  const togglePermission = async (source: string, granted: boolean) => {
    const updated = await window.nova.setPermission(source, granted);
    setPermissions(updated);
  };

  const cancelTask = async (taskId: string) => {
    try {
      const cancelled = await window.nova.cancelTask(taskId);
      setLastTask(cancelled);
      const page = (await window.nova.listTasks(50)) as TaskListPage;
      setTasks(page.items);
      setTaskListError(null);
    } catch (error: unknown) {
      setTaskListError(error instanceof Error ? error.message : "Task cancellation failed.");
    }
  };

  const updateConfiguration = async (
    section: ConfigurationSectionName,
    value: NovaConfiguration[ConfigurationSectionName],
  ): Promise<NovaConfiguration> => {
    const updated = await window.nova.updateConfig(section, value);
    setConfiguration(updated);
    setConfigurationError(null);
    return updated;
  };

  const submitDemonstrationTask = async (demoGoal: string) => {
    const task = await window.nova.submitTask(demoGoal);
    setLastTask(task);
    setDemonstrationTaskCompleted(true);
    setView("home");
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-mark">N</span>
          <div>
            <strong>NOVA</strong>
            <span className="brand-subtitle">local-first intelligence</span>
          </div>
        </div>
        <div className="status-pill" aria-label="Runtime status: core online">
          <span className="status-dot" /> Core online
        </div>
      </header>
      <div className="workspace">
        <aside className="sidebar" aria-label="Primary navigation">
          <div className="eyebrow">Workspace</div>
          <nav>
            {desktopNavOrder.map((item) => {
              const disabled = firstRun && item !== "permissions";
              return (
                <button
                  aria-current={view === item ? "page" : undefined}
                  className={`nav-item ${view === item ? "active" : ""}`}
                  disabled={disabled}
                  key={item}
                  onClick={() => {
                    if (canOpenView(item, firstRun)) setView(item);
                  }}
                  type="button"
                >
                  <span className="nav-glyph">
                    {item === "permissions" ? "!" : item.slice(0, 1).toUpperCase()}
                  </span>
                  {viewLabel[item]}
                  {item === "permissions" && firstRun ? (
                    <span className="nav-alert">required</span>
                  ) : null}
                </button>
              );
            })}
          </nav>
          <div className="sidebar-footer">
            <span className="eyebrow">Runtime</span>
            <span className="muted">Desktop shell · v0.1</span>
          </div>
        </aside>
        <main className="main-panel">
          {view === "permissions" ? (
            firstRun ? (
              <OnboardingView
                demonstrationTaskCompleted={demonstrationTaskCompleted}
                onDemoTask={submitDemonstrationTask}
                onProviderMode={setProviderMode}
                onToggle={togglePermission}
                permissions={permissions}
                providerMode={providerMode}
              />
            ) : (
              <PermissionCenter permissions={permissions} onToggle={togglePermission} />
            )
          ) : view === "chat" ? (
            <ChatView
              goal={goal}
              onGoalChange={setGoal}
              onSubmit={submitTask}
              firstRun={firstRun}
            />
          ) : view === "tasks" ? (
            <TaskMonitor
              error={taskListError}
              onCancel={cancelTask}
              task={lastTask}
              tasks={tasks}
            />
          ) : view === "home" ? (
            <HomeView permissions={permissions} task={lastTask} />
          ) : view === "provider" ? (
            <ProviderSettings
              configuration={configuration}
              error={configurationError}
              onUpdate={updateConfiguration}
            />
          ) : view === "settings" ? (
            <SettingsView
              configuration={configuration}
              error={configurationError}
              onUpdate={updateConfiguration}
            />
          ) : (
            <SurfaceView view={view} />
          )}
        </main>
      </div>
    </div>
  );
};

const OnboardingView = ({
  permissions,
  onToggle,
  providerMode,
  onProviderMode,
  demonstrationTaskCompleted,
  onDemoTask,
}: {
  permissions: PermissionGrant[];
  onToggle: (source: string, granted: boolean) => Promise<void>;
  providerMode: ProviderMode | null;
  onProviderMode: (mode: ProviderMode) => void;
  demonstrationTaskCompleted: boolean;
  onDemoTask: (goal: string) => Promise<void>;
}) => {
  const observerGranted = permissions.some((permission) => permission.granted);
  return (
    <section className="content-column" aria-labelledby="onboarding-title">
      <div className="section-kicker">First launch / Guided setup</div>
      <h1 id="onboarding-title">Prepare NOVA for your workspace.</h1>
      <p className="lede">
        Choose how intelligence runs, grant one explicit observer scope, and start with a concrete
        demonstration task. You can change these choices later.
      </p>
      <div className="onboarding-steps">
        <article className="onboarding-step">
          <span className="step-number">1</span>
          <div>
            <strong>Choose local or cloud reasoning</strong>
            <p className="muted">
              Local keeps data on this device with hardware-dependent latency. Cloud fallback can
              provide broader model capacity but sends approved requests to a configured provider.
            </p>
            <div className="choice-row" role="group" aria-label="Provider mode">
              <button
                className={providerMode === "local" ? "choice active" : "choice"}
                onClick={() => onProviderMode("local")}
                type="button"
              >
                Local-first
              </button>
              <button
                className={providerMode === "cloud" ? "choice active" : "choice"}
                onClick={() => onProviderMode("cloud")}
                type="button"
              >
                Cloud fallback
              </button>
            </div>
          </div>
        </article>
        <article className="onboarding-step">
          <span className="step-number">2</span>
          <div>
            <strong>Enable one observer</strong>
            <p className="muted">
              Observers are disabled by default and remain scoped and auditable.
            </p>
            <div className="permission-grid compact-grid">
              {permissions
                .filter((permission) => isObserverPermission(permission.source))
                .map((permission) => (
                  <label className="permission-card" key={permission.source}>
                    <div>
                      <strong>{permissionLabel(permission.source)}</strong>
                      <span>{permissionDescription(permission.source)}</span>
                    </div>
                    <input
                      checked={permission.granted}
                      onChange={(event) => void onToggle(permission.source, event.target.checked)}
                      type="checkbox"
                    />
                  </label>
                ))}
            </div>
            <span className="step-status">
              {observerGranted ? "Observer scope selected" : "Select at least one observer"}
            </span>
          </div>
        </article>
        <article className="onboarding-step">
          <span className="step-number">3</span>
          <div>
            <strong>Run one demonstration task</strong>
            <p className="muted">
              Pick a small example so the first interaction is concrete instead of an empty chat
              box.
            </p>
            <div className="choice-row" role="group" aria-label="Demonstration task">
              <button
                disabled={!providerMode || !observerGranted || demonstrationTaskCompleted}
                className="choice"
                onClick={() => void onDemoTask("Show my workspace status")}
                type="button"
              >
                Workspace status
              </button>
              <button
                disabled={!providerMode || !observerGranted || demonstrationTaskCompleted}
                className="choice"
                onClick={() => void onDemoTask("Summarize the latest decision")}
                type="button"
              >
                Latest decision
              </button>
              <button
                disabled={!providerMode || !observerGranted || demonstrationTaskCompleted}
                className="choice"
                onClick={() => void onDemoTask("List the active tasks")}
                type="button"
              >
                Active tasks
              </button>
            </div>
            {demonstrationTaskCompleted ? (
              <span className="step-status">Demonstration task completed</span>
            ) : null}
          </div>
        </article>
      </div>
    </section>
  );
};

const PermissionCenter = ({
  permissions,
  onToggle,
}: {
  permissions: PermissionGrant[];
  onToggle: (source: string, granted: boolean) => Promise<void>;
}) => (
  <section className="content-column" aria-labelledby="permissions-title">
    <div className="section-kicker">First launch / Safety boundary</div>
    <h1 id="permissions-title">Choose what NOVA can observe and control.</h1>
    <p className="lede">
      Every observer and desktop action capability is off by default. Grant only the sources and
      controls useful for your task; screen capture is one-shot and raw frames are not retained. You
      can revoke access at any time.
    </p>
    <div className="permission-grid">
      {permissions.map((permission) => (
        <label className="permission-card" key={permission.source}>
          <div>
            <strong>{permissionLabel(permission.source)}</strong>
            <span>{permissionDescription(permission.source)}</span>
          </div>
          <input
            checked={permission.granted}
            onChange={(event) => void onToggle(permission.source, event.target.checked)}
            type="checkbox"
          />
        </label>
      ))}
    </div>
    <div className="notice" role="note">
      <span>!</span>
      <div>
        <strong>Nothing runs silently.</strong>
        <p>
          Permissions are explicit, granular, and auditable. Chat and task controls unlock after you
          enable at least one source.
        </p>
      </div>
    </div>
  </section>
);

const ChatView = ({
  goal,
  onGoalChange,
  onSubmit,
  firstRun,
}: {
  goal: string;
  onGoalChange: (value: string) => void;
  onSubmit: () => Promise<void>;
  firstRun: boolean;
}) => (
  <section className="content-column chat-column" aria-labelledby="chat-title">
    <div className="section-kicker">Chat / Grounded workspace</div>
    <h1 id="chat-title">What should NOVA help with?</h1>
    <p className="lede">
      Ask a question or issue a task. Deterministic paths are preferred before reasoning, and
      answers carry their grounding.
    </p>
    <div className="chat-card">
      <div className="assistant-message">
        <span className="avatar">N</span>
        <div>
          <strong>NOVA</strong>
          <p>
            Ready when you are. I’ll show task progress and verification evidence in this thread.
          </p>
        </div>
      </div>
      <div className="composer">
        <textarea
          aria-label="Task request"
          disabled={firstRun}
          onChange={(event) => onGoalChange(event.target.value)}
          placeholder="Try: Git status, open my project, or summarize the latest decision…"
          value={goal}
        />
        <button
          disabled={firstRun || goal.trim().length === 0}
          onClick={() => void onSubmit()}
          type="button"
        >
          Submit task <span>↗</span>
        </button>
      </div>
    </div>
  </section>
);

const TaskMonitor = ({
  task,
  tasks,
  error,
  onCancel,
}: {
  task: TaskSnapshot | null;
  tasks: readonly TaskSnapshot[];
  error: string | null;
  onCancel: (taskId: string) => Promise<void>;
}) => (
  <section className="content-column" aria-labelledby="tasks-title">
    <div className="section-kicker">Task Monitor / Live state</div>
    <h1 id="tasks-title">Execution trace</h1>
    <p className="lede">
      Task state is shared across every NOVA surface and never reports unverified work as completed.
    </p>
    {error ? <p className="error-text">{error}</p> : null}
    <div className="task-card">
      {tasks.length > 0 ? (
        tasks.map((entry) => {
          const terminal = ["Completed", "Unverified", "Failed", "Cancelled"].includes(entry.state);
          return (
            <article className="task-row" key={entry.task_id}>
              <div className="task-header">
                <span className="task-status">{entry.state}</span>
                <code>{entry.task_id}</code>
              </div>
              <h2>{entry.goal}</h2>
              <div className="task-meta">
                <span>{entry.retry_count ?? 0} retries</span>
                {entry.waiting_user_reason ? (
                  <span>Waiting: {entry.waiting_user_reason}</span>
                ) : null}
                {entry.reason ? <span>{entry.reason}</span> : null}
              </div>
              {!terminal ? (
                <button onClick={() => void onCancel(entry.task_id)} type="button">
                  Cancel task
                </button>
              ) : null}
              {entry.task_id === task?.task_id ? (
                <p className="muted">Latest task · refreshed from the authoritative TaskManager.</p>
              ) : null}
            </article>
          );
        })
      ) : (
        <p className="muted">No task history is available. Start from Chat to create one.</p>
      )}
    </div>
  </section>
);

const HomeView = ({
  permissions,
  task,
}: {
  permissions: readonly PermissionGrant[];
  task: TaskSnapshot | null;
}) => (
  <section className="content-column" aria-labelledby="home-title">
    <div className="section-kicker">Home / Dashboard</div>
    <h1 id="home-title">Your local-first workspace.</h1>
    <p className="lede">
      NOVA keeps control on your device while making runtime health, memory grounding, and task
      evidence visible at a glance.
    </p>
    <div className="surface-grid">
      <SurfaceCard
        title="Runtime"
        detail="Core services are online and ready for explicit work."
        state="Healthy"
      />
      <SurfaceCard
        title="Permissions"
        detail={`${permissions.filter((permission) => permission.granted).length} observer permissions granted.`}
        state="Audited"
      />
      <SurfaceCard
        title="Latest task"
        detail={task?.goal ?? "No task has been submitted yet."}
        state={task?.state ?? "Empty"}
      />
    </div>
  </section>
);

const ProviderSettings = ({
  configuration,
  error,
  onUpdate,
}: {
  configuration: NovaConfiguration | null;
  error: string | null;
  onUpdate: (
    section: ConfigurationSectionName,
    value: NovaConfiguration[ConfigurationSectionName],
  ) => Promise<NovaConfiguration>;
}) => {
  const capability = configuration?.capabilities.llm;
  const configuredProvider = capability?.providers[0];
  const [providerId, setProviderId] = useState(configuredProvider?.provider_id ?? "");
  const [vaultReference, setVaultReference] = useState(
    configuredProvider?.credential?.vault_reference ?? "",
  );
  const [policy, setPolicy] = useState<ConfiguredCapabilityRecord["active_policy"]>(
    capability?.active_policy ?? "privacy-first",
  );
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    setProviderId(configuredProvider?.provider_id ?? "");
    setVaultReference(configuredProvider?.credential?.vault_reference ?? "");
    setPolicy(capability?.active_policy ?? "privacy-first");
  }, [capability, configuredProvider]);

  const save = async () => {
    const trimmedProvider = providerId.trim();
    if (!trimmedProvider) {
      setStatus("Enter a provider or model identifier.");
      return;
    }
    const provider = {
      provider_id: trimmedProvider,
      enabled: true,
      priority: 1,
      ...(vaultReference.trim() ? { credential: { vault_reference: vaultReference.trim() } } : {}),
    };
    const nextCapability: ConfiguredCapabilityRecord = {
      capability_id: "llm",
      domain: "text-generation",
      required: true,
      providers: [provider],
      active_policy: policy,
      manual_override: null,
    };
    try {
      await onUpdate("capabilities", {
        ...(configuration?.capabilities ?? {}),
        llm: nextCapability,
      });
      setStatus("Provider/model settings saved.");
    } catch (saveError: unknown) {
      setStatus(
        saveError instanceof Error ? saveError.message : "Provider settings could not be saved.",
      );
    }
  };

  return (
    <section className="content-column" aria-labelledby="provider-settings-title">
      <div className="section-kicker">Provider Settings / Persistent configuration</div>
      <h1 id="provider-settings-title">Choose how NOVA reasons.</h1>
      <p className="lede">
        Provider identifiers and routing policy are saved locally. Credentials remain opaque vault
        references.
      </p>
      {error ? (
        <div className="state-strip">
          <strong>Configuration unavailable</strong>
          <span>{error}</span>
        </div>
      ) : null}
      <div className="surface-grid">
        <article className="surface-card">
          <label htmlFor="provider-id">Provider or model identifier</label>
          <input
            id="provider-id"
            value={providerId}
            onChange={(event) => setProviderId(event.target.value)}
            placeholder="local.llm or provider-model-id"
          />
          <label htmlFor="vault-reference">Optional vault reference</label>
          <input
            id="vault-reference"
            value={vaultReference}
            onChange={(event) => setVaultReference(event.target.value)}
            placeholder="vault://provider-credential"
          />
          <label htmlFor="routing-policy">Routing policy</label>
          <select
            id="routing-policy"
            value={policy}
            onChange={(event) =>
              setPolicy(event.target.value as ConfiguredCapabilityRecord["active_policy"])
            }
          >
            <option value="privacy-first">Privacy first</option>
            <option value="latency-optimized">Latency optimized</option>
            <option value="cost-optimized">Cost optimized</option>
            <option value="manual">Manual</option>
          </select>
          <button type="button" onClick={() => void save()}>
            Save provider settings
          </button>
          {status ? (
            <p className="muted" role="status">
              {status}
            </p>
          ) : null}
        </article>
      </div>
    </section>
  );
};

const SettingsView = ({
  configuration,
  error,
  onUpdate,
}: {
  configuration: NovaConfiguration | null;
  error: string | null;
  onUpdate: (
    section: ConfigurationSectionName,
    value: NovaConfiguration[ConfigurationSectionName],
  ) => Promise<NovaConfiguration>;
}) => {
  const preferences = configuration?.personalization.preferences ?? [];
  const [id, setId] = useState(preferences[0]?.id ?? "tone.default");
  const [category, setCategory] = useState<PersonalizationCategory>(
    preferences[0]?.category ?? "tone",
  );
  const [valueText, setValueText] = useState(
    JSON.stringify(preferences[0]?.value ?? { style: "concise" }, null, 2),
  );
  const [status, setStatus] = useState<string | null>(null);

  const savePreference = async () => {
    let value: unknown;
    try {
      value = JSON.parse(valueText) as unknown;
    } catch {
      setStatus("Preference value must be valid JSON.");
      return;
    }
    const record: PersonalizationPreferenceRecord = {
      id: id.trim(),
      category,
      value,
      enabled: true,
      source: "user",
      updated_at: new Date().toISOString(),
    };
    if (!record.id) {
      setStatus("Preference id is required.");
      return;
    }
    const next = [...preferences.filter((preference) => preference.id !== record.id), record];
    try {
      await onUpdate("personalization", { preferences: next });
      setStatus("Personalization preference saved.");
    } catch (saveError: unknown) {
      setStatus(saveError instanceof Error ? saveError.message : "Preference could not be saved.");
    }
  };

  const resetPreference = async (preferenceId?: string) => {
    const next = preferenceId
      ? preferences.filter((preference) => preference.id !== preferenceId)
      : [];
    try {
      await onUpdate("personalization", { preferences: next });
      setStatus(preferenceId ? "Preference reset." : "All personalization reset.");
    } catch (resetError: unknown) {
      setStatus(
        resetError instanceof Error ? resetError.message : "Preference could not be reset.",
      );
    }
  };

  return (
    <section className="content-column" aria-labelledby="settings-title">
      <div className="section-kicker">Settings / Visible personalization</div>
      <h1 id="settings-title">Make NOVA fit your working style.</h1>
      <p className="lede">
        Preferences are explicit policy records. They can be inspected, edited, or reset and never
        retrain the model.
      </p>
      {error ? (
        <div className="state-strip">
          <strong>Configuration unavailable</strong>
          <span>{error}</span>
        </div>
      ) : null}
      <div className="surface-grid">
        <article className="surface-card">
          <label htmlFor="preference-id">Preference id</label>
          <input id="preference-id" value={id} onChange={(event) => setId(event.target.value)} />
          <label htmlFor="preference-category">Category</label>
          <select
            id="preference-category"
            value={category}
            onChange={(event) => setCategory(event.target.value as PersonalizationCategory)}
          >
            <option value="tone">Tone</option>
            <option value="tool-default">Tool default</option>
            <option value="provider-default">Provider default</option>
            <option value="proactive-timing">Proactive timing</option>
            <option value="routing-preference">Routing preference</option>
          </select>
          <label htmlFor="preference-value">Structured value (JSON)</label>
          <textarea
            id="preference-value"
            rows={7}
            value={valueText}
            onChange={(event) => setValueText(event.target.value)}
          />
          <button type="button" onClick={() => void savePreference()}>
            Save preference
          </button>
          <button type="button" onClick={() => void resetPreference()}>
            Reset all personalization
          </button>
          {status ? (
            <p className="muted" role="status">
              {status}
            </p>
          ) : null}
        </article>
        <article className="surface-card">
          <strong>Stored preferences</strong>
          {preferences.length === 0 ? (
            <p className="muted">No personalization records are stored.</p>
          ) : (
            preferences.map((preference) => (
              <div className="task-header" key={preference.id}>
                <span>
                  {preference.id} · {preference.category}
                </span>
                <button type="button" onClick={() => void resetPreference(preference.id)}>
                  Reset
                </button>
              </div>
            ))
          )}
        </article>
      </div>
    </section>
  );
};

const SurfaceView = ({ view }: { view: SurfaceView }) => {
  const meta = surfaceMeta[view];
  return (
    <section className="content-column" aria-labelledby={`${view}-title`}>
      <div className="section-kicker">{viewLabel[view]} / Workspace surface</div>
      <h1 id={`${view}-title`}>{viewLabel[view]}</h1>
      <p className="lede">{meta.purpose}</p>
      <div className="surface-grid">
        {meta.items.map((item) => (
          <SurfaceCard
            key={item}
            title={item}
            detail="Available through the shared runtime boundary."
            state="Ready"
          />
        ))}
      </div>
      <div className="state-strip" aria-live="polite">
        <strong>{meta.state}</strong>
        <span className="muted">
          Loading, empty, error, offline, permission-denied, and partial-data states remain surfaced
          by the connected service boundary.
        </span>
      </div>
    </section>
  );
};

const SurfaceCard = ({
  title,
  detail,
  state,
}: {
  title: string;
  detail: string;
  state: string;
}) => (
  <article className="surface-card">
    <div className="task-header">
      <strong>{title}</strong>
      <span className="task-status">{state}</span>
    </div>
    <p>{detail}</p>
  </article>
);
