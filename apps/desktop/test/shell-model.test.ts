import { describe, expect, it } from "vitest";
import { canOpenView, initialView } from "../src/renderer/shell-model.js";

describe("desktop shell model", () => {
  it("starts first-run users in the permission center", () => {
    expect(initialView(true)).toBe("permissions");
    expect(canOpenView("chat", true)).toBe(false);
    expect(canOpenView("permissions", true)).toBe(true);
  });

  it("opens chat for an already-configured user", () => {
    expect(initialView(false)).toBe("chat");
    expect(canOpenView("chat", false)).toBe(true);
  });
});
