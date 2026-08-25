import { describe, expect, it } from "vitest";
import { projectPreparedRestore } from "../src/main/response-projections.js";

describe("prepared restore renderer boundary", () => {
  it("projects only an opaque restore handle", () => {
    const projected = projectPreparedRestore("restore-handle-1");

    expect(projected).toEqual({ restore_id: "restore-handle-1", verified: true });
    expect(JSON.stringify(projected)).not.toContain("staged-secret");
  });
});
