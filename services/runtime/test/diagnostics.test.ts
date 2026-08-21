import { describe, expect, it } from "vitest";
import { DiagnosticsCollector, type DiagnosticInputs } from "../src/diagnostics.js";

const inputs: DiagnosticInputs = {
  config: {
    capabilities: { provider: "local" },
    credential: { vault_reference: "vault://key" },
    token: "secret",
  },
  logs: ["runtime healthy"],
  traces: ["trace-1"],
  doctor: { status: "ok" },
  env: { os: "linux" },
  plugins: [{ plugin_id: "com.example.plugin", version: "1.0.0" }],
  tasks: [{ task_id: "task-1", status: "Completed", pii: "user@example.com" }],
};

describe("DiagnosticsCollector", () => {
  it("redacts credential and PII fields while retaining diagnostic structure", () => {
    const collector = new DiagnosticsCollector(() => inputs);

    const bundle = collector.collect();

    expect(bundle).toMatchObject({
      files: expect.arrayContaining(["config.json", "logs.txt", "doctor.json", "tasks.json"]),
    });
    const config = bundle.contents["config.json"] ?? "";
    const tasks = bundle.contents["tasks.json"] ?? "";
    expect(config).not.toContain("secret");
    expect(tasks).not.toContain("user@example.com");
    expect(config).toContain("vault://key");
  });

  it("limits task records to the configured recent window", () => {
    const many: DiagnosticInputs = {
      ...inputs,
      tasks: Array.from({ length: 20 }, (_, index) => ({
        task_id: `task-${index}`,
        status: "Failed",
      })),
    };
    const collector = new DiagnosticsCollector(() => many, { maxTasks: 5 });

    const bundle = collector.collect();
    const tasks = JSON.parse(bundle.contents["tasks.json"] ?? "[]") as unknown[];

    expect(tasks).toHaveLength(5);
    expect(tasks[0]).toMatchObject({ task_id: "task-15" });
  });
});
