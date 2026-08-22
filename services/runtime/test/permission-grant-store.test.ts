import { describe, expect, it } from "vitest";
import { PermissionGrantStore } from "../src/permission-grant-store.js";

describe("PermissionGrantStore", () => {
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
