import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { ToolRegistry } from "../src/tool-registry.js";
import { createWorkspaceCodeTool, WorkspaceCodeExecutor } from "../src/workspace-code-executor.js";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true })),
  );
});

const workspace = async () => {
  const directory = await mkdtemp(join(tmpdir(), "nova-code-workspace-"));
  temporaryDirectories.push(directory);
  return directory;
};

describe("WorkspaceCodeExecutor", () => {
  it("rejects scripts outside the canonical allowed workspace", async () => {
    const root = await workspace();
    const outside = join(root, "..", "outside.mjs");
    const executor = new WorkspaceCodeExecutor({
      workspaceRoot: root,
      runtimes: { node: process.execPath },
    });

    const result = await executor.run({
      runtime_id: "node",
      script_path: outside,
      args: [],
      timeout_ms: 2_000,
    });

    expect(result).toMatchObject({ ok: false, error: { code: "NOVA-SEC001" } });
  });

  it("executes an explicitly registered runtime without a shell and returns exit evidence", async () => {
    const root = await workspace();
    const script = join(root, "print-cwd.mjs");
    await writeFile(script, "process.stdout.write(process.cwd());\n", "utf8");
    const executor = new WorkspaceCodeExecutor({
      workspaceRoot: root,
      runtimes: { node: process.execPath },
    });

    const result = await executor.run({
      runtime_id: "node",
      script_path: script,
      args: [],
      timeout_ms: 2_000,
    });

    expect(result).toMatchObject({
      ok: true,
      value: {
        status: "success",
        evidence: { type: "exit_code", value: { exit_code: 0, stdout: root } },
        affected_resources: [script],
      },
    });
  });

  it("kills a timed-out program and reports a timeout-shaped failure", async () => {
    const root = await workspace();
    const script = join(root, "hang.mjs");
    await writeFile(script, "setInterval(() => undefined, 1000);\n", "utf8");
    const executor = new WorkspaceCodeExecutor({
      workspaceRoot: root,
      runtimes: { node: process.execPath },
    });

    const result = await executor.run({
      runtime_id: "node",
      script_path: script,
      args: [],
      timeout_ms: 40,
    });

    expect(result).toMatchObject({
      ok: true,
      value: {
        status: "failure",
        evidence: { type: "exit_code", value: { timed_out: true } },
        error: { category: "transient", message: "Tool execution timed out." },
      },
    });
  });

  it("does not accept an unregistered runtime", async () => {
    const root = await workspace();
    const script = join(root, "script.mjs");
    await writeFile(script, "process.exit(0);\n", "utf8");
    const executor = new WorkspaceCodeExecutor({
      workspaceRoot: root,
      runtimes: { node: process.execPath },
    });

    const result = await executor.run({
      runtime_id: "powershell",
      script_path: script,
      args: [],
      timeout_ms: 2_000,
    });

    expect(result).toMatchObject({ ok: false, error: { code: "NOVA-TL004" } });
  });

  it("rejects malformed action arguments instead of coercing them", async () => {
    const root = await workspace();
    const script = join(root, "script.mjs");
    await writeFile(script, "process.exit(0);\n", "utf8");
    const tool = createWorkspaceCodeTool({
      workspaceRoot: root,
      runtimes: { node: process.execPath },
    });

    const result = await tool.registration.actions.run_script.execute({
      runtime_id: "node",
      script_path: script,
      args: [3],
      timeout_ms: 2_000,
    });

    expect(result).toMatchObject({ status: "failure", error: { category: "validation" } });
  });

  it("registers the code tool with explicit CLI metadata and non-idempotent execution", () => {
    const registration = createWorkspaceCodeTool({
      workspaceRoot: "/workspace",
      runtimes: { node: process.execPath },
    });
    const registry = new ToolRegistry();

    expect(registry.register(registration.metadata)).toMatchObject({ ok: true });
    expect(registration.metadata.execution_tier).toBe("cli");
    expect(registration.metadata.supported_actions[0]?.verification_signal).toBe("exit_code");
    expect(registration.metadata.supported_actions[0]?.idempotent).toBe(false);
  });
});
