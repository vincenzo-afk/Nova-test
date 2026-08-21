import { describe, expect, it, vi } from "vitest";
import { CalendarAssistant, type CalendarProvider } from "../src/calendar-assistant.js";

const provider: CalendarProvider = {
  calendar_id: "personal",
  list: vi.fn(async () => [
    { id: "event-1", title: "Standup", start: 100, end: 200, owner: true, attendees: [] },
  ]),
  create: vi.fn(async (draft) => ({ id: "event-2", ...draft })),
};

describe("CalendarAssistant", () => {
  it("merges upcoming events from connected calendars", async () => {
    const second: CalendarProvider = {
      ...provider,
      calendar_id: "work",
      list: vi.fn(async () => [
        { id: "event-3", title: "Review", start: 50, end: 80, owner: true, attendees: [] },
      ]),
    };
    const assistant = new CalendarAssistant([provider, second]);

    expect(await assistant.upcoming()).toMatchObject({
      ok: true,
      value: [{ id: "event-3" }, { id: "event-1" }],
    });
  });

  it("detects conflicts before presenting a create draft", async () => {
    const assistant = new CalendarAssistant([provider]);

    const draft = await assistant.propose({
      title: "Planning",
      start: 150,
      end: 250,
      attendees: [],
      owner: true,
    });

    expect(draft).toMatchObject({ ok: true, value: { conflicts: [{ id: "event-1" }] } });
  });

  it("allows a non-conflicting owned event without confirmation but requires confirmation for external effects", async () => {
    const assistant = new CalendarAssistant([{ ...provider, list: vi.fn(async () => []) }]);
    const ownDraft = { title: "Focus", start: 300, end: 400, attendees: [], owner: true };
    const externalDraft = {
      title: "Call",
      start: 500,
      end: 600,
      attendees: ["guest@example.com"],
      owner: true,
    };

    expect(await assistant.create(ownDraft, false)).toMatchObject({
      ok: true,
      value: { id: "event-2" },
    });
    expect(await assistant.create(externalDraft, false)).toMatchObject({
      ok: false,
      error: { code: "NOVA-SEC001" },
    });
    expect(await assistant.create(externalDraft, true)).toMatchObject({ ok: true });
  });
});
