import { describe, expect, it } from "vitest";
import {
  canOpenView,
  desktopNavOrder,
  initialView,
  isOnboardingComplete,
  viewLabel,
} from "../src/renderer/shell-model.js";

describe("desktop shell model", () => {
  it("starts first-run users in the permission center", () => {
    expect(initialView(true)).toBe("permissions");
    expect(canOpenView("chat", true)).toBe(false);
    expect(canOpenView("permissions", true)).toBe(true);
  });

  it("opens the Home dashboard for an already-configured user", () => {
    expect(initialView(false)).toBe("home");
    expect(canOpenView("chat", false)).toBe(true);
  });

  it("contains every documented desktop screen in the typed navigation catalog", () => {
    expect(desktopNavOrder).toEqual([
      "home",
      "chat",
      "tasks",
      "memory",
      "graph",
      "workflow",
      "voice",
      "devices",
      "provider",
      "plugins",
      "diagnostics",
      "logs",
      "settings",
      "updates",
      "permissions",
    ]);
    for (const view of desktopNavOrder) {
      expect(viewLabel[view]).toBeTruthy();
    }
  });

  it("keeps every non-permission screen locked during first-run onboarding", () => {
    for (const view of desktopNavOrder) {
      expect(canOpenView(view, true)).toBe(view === "permissions");
    }
  });

  it("requires provider choice, an observer permission, and a demo task", () => {
    expect(isOnboardingComplete(null, true, true)).toBe(false);
    expect(isOnboardingComplete("local", false, true)).toBe(false);
    expect(isOnboardingComplete("cloud", true, false)).toBe(false);
    expect(isOnboardingComplete("local", true, true)).toBe(true);
  });
});
