import { describe, expect, it } from "vitest";
import { MemoryLogSink, StructuredLogger } from "@nova/shared";
import { PermissionGrantStore } from "../src/permission-grant-store.js";

describe("PermissionGrantStore", () => {
  it("logs permission updates and rejected sources without sensitive values", () => {
    const sink = new MemoryLogSink();
    const store = new PermissionGrantStore(
      { initial: [{ source: "browser_metadata", granted: false }] },
      new StructuredLogger({ service: "runtime.permissions", sink }),
    );

    expect(store.update("browser_metadata", true)).toMatchObject({ ok: true });
    expect(store.update("missing", true)).toMatchObject({
      ok: false,
      error: { code: "NOVA-SEC001" },
    });

    expect(sink.records().map((record) => record.event)).toEqual([
      "permission.updated",
      "permission.update.rejected",
    ]);
    expect(sink.records()[0]?.details).toMatchObject({ source: "browser_metadata", granted: true });
  });

  it("lists immutable grant snapshots and updates a source immediately", () => {
    const store = new PermissionGrantStore({
      initial: [
        { source: "filesystem", granted: false },
        { source: "clipboard", granted: false },
      ],
    });

    expect(store.list()).toEqual([
      { source: "filesystem", granted: false },
      { source: "clipboard", granted: false },
    ]);
    expect(store.update("filesystem", true)).toMatchObject({
      ok: true,
      value: { source: "filesystem", granted: true },
    });
    expect(store.list()[0]).toEqual({ source: "filesystem", granted: true });
  });

  it("rejects updates for a source that is not registered", () => {
    const store = new PermissionGrantStore({ initial: [] });

    expect(store.update("unknown", true)).toMatchObject({
      ok: false,
      error: { code: "NOVA-SEC001" },
    });
  });
});
