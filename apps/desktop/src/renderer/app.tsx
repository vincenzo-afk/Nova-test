import { useEffect, useMemo, useState } from "react";
import {
  canOpenView,
  initialView,
  type DesktopView,
  type PermissionGrant,
  viewLabel,
} from "./shell-model.js";

const navOrder: readonly DesktopView[] = ["chat", "tasks", "memory", "graph", "permissions"];

export const App = () => {
  const [permissions, setPermissions] = useState<PermissionGrant[]>([]);
  const [view, setView] = useState<DesktopView>(initialView(true));
  const [goal, setGoal] = useState("");
  const [lastTask, setLastTask] = useState<{ task_id: string; goal: string; state: string } | null>(
    null,
  );

  useEffect(() => {
    void window.nova.getPermissions().then(setPermissions);
  }, []);

  const firstRun = useMemo(
    () => permissions.length > 0 && permissions.every((permission) => !permission.granted),
    [permissions],
  );

  useEffect(() => {
    if (firstRun) {
      setView(initialView(true));
    }
  }, [firstRun]);

  const submitTask = async () => {
    const trimmed = goal.trim();
    if (!trimmed) {
      return;
    }
    const task = await window.nova.submitTask(trimmed);
    setLastTask(task);
    setGoal("");
    setView("tasks");
  };

  const togglePermission = async (source: string, granted: boolean) => {
    const updated = await window.nova.setPermission(source, granted);
    setPermissions(updated);
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
        <div className="status-pill">
          <span className="status-dot" /> Core online
        </div>
      </header>
      <div className="workspace">
        <aside className="sidebar" aria-label="Primary navigation">
          <div className="eyebrow">Workspace</div>
          <nav>
            {navOrder.map((item) => {
              const disabled = firstRun && item !== "permissions";
              return (
                <button
                  className={`nav-item ${view === item ? "active" : ""}`}
                  disabled={disabled}
                  key={item}
                  onClick={() => {
                    if (canOpenView(item, firstRun)) setView(item);
                  }}
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
            <PermissionCenter permissions={permissions} onToggle={togglePermission} />
          ) : view === "chat" ? (
            <ChatView
              goal={goal}
              onGoalChange={setGoal}
              onSubmit={submitTask}
              firstRun={firstRun}
            />
          ) : view === "tasks" ? (
            <TaskMonitor task={lastTask} />
          ) : (
            <PlaceholderView view={view} />
          )}
        </main>
      </div>
    </div>
  );
};

const PermissionCenter = ({
  permissions,
  onToggle,
}: {
  permissions: PermissionGrant[];
  onToggle: (source: string, granted: boolean) => Promise<void>;
}) => (
  <section className="content-column">
    <div className="section-kicker">First launch / Safety boundary</div>
    <h1>Choose what NOVA can observe.</h1>
    <p className="lede">
      Every observer is off by default. Grant only the sources and folders that are useful for your
      workspace; you can revoke access at any time.
    </p>
    <div className="permission-grid">
      {permissions.map((permission) => (
        <label className="permission-card" key={permission.source}>
          <div>
            <strong>{permission.source}</strong>
            <span>
              {permission.source === "filesystem"
                ? "Scoped folders only"
                : "Metadata only until expanded"}
            </span>
          </div>
          <input
            checked={permission.granted}
            onChange={(event) => void onToggle(permission.source, event.target.checked)}
            type="checkbox"
          />
        </label>
      ))}
    </div>
    <div className="notice">
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
  <section className="content-column chat-column">
    <div className="section-kicker">Chat / Grounded workspace</div>
    <h1>What should NOVA help with?</h1>
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
        <button disabled={firstRun || goal.trim().length === 0} onClick={() => void onSubmit()}>
          Submit task <span>↗</span>
        </button>
      </div>
    </div>
  </section>
);

const TaskMonitor = ({
  task,
}: {
  task: { task_id: string; goal: string; state: string } | null;
}) => (
  <section className="content-column">
    <div className="section-kicker">Task Monitor / Live state</div>
    <h1>Execution trace</h1>
    <p className="lede">
      Task state is shared across every NOVA surface and never reports unverified work as completed.
    </p>
    <div className="task-card">
      {task ? (
        <>
          <div className="task-header">
            <span className="task-status">{task.state}</span>
            <code>{task.task_id}</code>
          </div>
          <h2>{task.goal}</h2>
          <div className="progress-rail">
            <span className="progress-fill" />
          </div>
          <p className="muted">
            Created through the internal API boundary. Planner, Executor, and Verifier updates will
            appear here.
          </p>
        </>
      ) : (
        <p className="muted">No task is currently active. Start from Chat to create one.</p>
      )}
    </div>
  </section>
);

const PlaceholderView = ({ view }: { view: DesktopView }) => (
  <section className="content-column">
    <div className="section-kicker">{viewLabel[view]}</div>
    <h1>{viewLabel[view]}</h1>
    <p className="lede">
      This surface is wired into the shared desktop shell and will reflect the same backend state as
      Chat and Task Monitor.
    </p>
    <div className="empty-state">
      <span className="empty-glyph">{view === "memory" ? "M" : "G"}</span>
      <strong>Surface ready for the next implementation milestone.</strong>
      <span className="muted">
        No parallel state or direct bus access is created in the renderer.
      </span>
    </div>
  </section>
);
