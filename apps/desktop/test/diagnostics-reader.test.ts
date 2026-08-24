import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { filterDiagnostics, readDiagnostics } from "../src/main/diagnostics.js";

describe("readDiagnostics", () => {
  it("returns an empty healthy snapshot when no log file exists", async () => {
    const directory = await mkdtemp(join(tmpdir(), "nova-diagnostics-"));

    const snapshot = await readDiagnostics(join(directory, "missing.jsonl"), 10);

    expect(snapshot).toMatchObject({ records: [], partial: false });
  });

  it("returns newest bounded log summaries without exposing detail payloads", async () => {
    const directory = await mkdtemp(join(tmpdir(), "nova-diagnostics-"));
    const path = join(directory, "logs", "nova.jsonl");
    await mkdir(join(directory, "logs"), { recursive: true });
    await writeFile(
      path,
      [
        JSON.stringify({
          timestamp: "2026-08-24T00:00:00.000Z",
          service: "desktop.main",
          severity: "info",
          event: "runtime.start.begin",
          correlation_id: "corr-1",
          details: { token: "secret-value", safe: "hidden" },
        }),
        JSON.stringify({
          timestamp: "2026-08-24T00:01:00.000Z",
          service: "desktop.main",
          severity: "warning",
          event: "observer.revoked",
          details: { source: "filesystem" },
        }),
      ].join("\n") + "\n",
      "utf8",
    );

    const snapshot = await readDiagnostics(path, 1);

    expect(snapshot.partial).toBe(false);
    expect(snapshot.records).toEqual([
      {
        timestamp: "2026-08-24T00:01:00.000Z",
        service: "desktop.main",
        severity: "warning",
        event: "observer.revoked",
      },
    ]);
  });

  it("marks the snapshot partial when a log line cannot be parsed", async () => {
    const directory = await mkdtemp(join(tmpdir(), "nova-diagnostics-"));
    const path = join(directory, "nova.jsonl");
    await writeFile(path, "not-json\n{}\n", "utf8");

    const snapshot = await readDiagnostics(path, 10);

    expect(snapshot.partial).toBe(true);
    expect(snapshot.records).toEqual([]);
  });

  it("filters records by severity and event text without mutating the snapshot", async () => {
    const directory = await mkdtemp(join(tmpdir(), "nova-diagnostics-"));
    const path = join(directory, "nova.jsonl");
    await writeFile(
      path,
      [
        JSON.stringify({
          timestamp: "2026-08-24T00:00:00.000Z",
          service: "desktop.main",
          severity: "info",
          event: "runtime.start.begin",
          details: {},
        }),
        JSON.stringify({
          timestamp: "2026-08-24T00:01:00.000Z",
          service: "desktop.main",
          severity: "error",
          event: "runtime.start.failed",
          details: {},
        }),
      ].join("\n") + "\n",
      "utf8",
    );
    const snapshot = await readDiagnostics(path, 10);

    expect(filterDiagnostics(snapshot.records, { severity: "error", event: "failed" })).toEqual([
      snapshot.records[1],
    ]);
    expect(filterDiagnostics(snapshot.records, { event: "missing" })).toEqual([]);
  });
});
