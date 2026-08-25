import { describe, expect, it } from "vitest";
import { projectBackupRestore } from "../src/main/response-projections.js";

describe("backup renderer boundary", () => {
  it("does not project restored snapshot contents to the renderer", () => {
    const projected = projectBackupRestore({
      provider_secret: "private-secret",
      memory_records: [{ content: "private content" }],
    });

    expect(projected).toEqual({ restored: true });
    expect(JSON.stringify(projected)).not.toContain("private-secret");
    expect(JSON.stringify(projected)).not.toContain("private content");
  });
});
