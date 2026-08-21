import { describe, expect, it, vi } from "vitest";
import {
  BackgroundAssistant,
  type BriefingSource,
  type ProactiveDestination,
} from "../src/background-assistant.js";

const source = (id: string, items: number): BriefingSource => ({
  source_id: id,
  collect: vi.fn(async () =>
    Array.from({ length: items }, (_, index) => ({
      title: `${id}-${index}`,
      summary: "summary",
      source_id: id,
      requires_confirmation: index === 0,
    })),
  ),
});

describe("BackgroundAssistant", () => {
  it("does not collect or deliver when proactive mode is disabled", async () => {
    const calendar = source("calendar", 1);
    const destination: ProactiveDestination = { deliver: vi.fn(async () => undefined) };
    const assistant = new BackgroundAssistant([calendar], destination, { enabled: false });

    expect(await assistant.generate("time-based")).toMatchObject({
      ok: true,
      value: { items: [] },
    });
    expect(calendar.collect).not.toHaveBeenCalled();
    expect(destination.deliver).not.toHaveBeenCalled();
  });

  it("composes source-attributed items and preserves confirmation boundaries", async () => {
    const calendar = source("calendar", 1);
    const email = source("email", 1);
    const assistant = new BackgroundAssistant(
      [calendar, email],
      { deliver: vi.fn(async () => undefined) },
      { enabled: true },
    );

    const briefing = await assistant.generate("explicit-request");

    expect(briefing).toMatchObject({
      ok: true,
      value: {
        trigger: "explicit-request",
        items: [{ source_id: "calendar" }, { source_id: "email" }],
      },
    });
    expect(briefing.ok && briefing.value.items.every((item) => item.requires_confirmation)).toBe(
      true,
    );
  });

  it("delivers only to the configured destination", async () => {
    const destination: ProactiveDestination = { deliver: vi.fn(async () => undefined) };
    const assistant = new BackgroundAssistant([source("tasks", 1)], destination, { enabled: true });
    const briefing = await assistant.generate("event-based");

    expect(
      await assistant.deliver(briefing.ok ? briefing.value : { trigger: "event-based", items: [] }),
    ).toMatchObject({ ok: true });
    expect(destination.deliver).toHaveBeenCalledOnce();
  });
});
