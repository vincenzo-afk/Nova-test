import { describe, expect, it } from "vitest";
import { InMemoryCommunicationBus, createMessage } from "@nova/shared";
import { WorldModel } from "../src/world-model.js";

const windowPayload = (overrides: Record<string, unknown> = {}) => ({
  window_id: "hwnd:42",
  process_id: 100,
  application_name: "Editor",
  title: "Notes.txt",
  monitor_id: "DISPLAY1",
  virtual_desktop_id: "desktop-1",
  z_order: 0,
  ...overrides,
});

const message = (topic: string, payload: unknown, timestamp: string, correlationId: string) => ({
  ...createMessage({
    topic,
    schema_version: "1.0.0",
    correlation_id: correlationId,
    source_service: "observer.windows",
    payload,
  }),
  timestamp,
});

describe("WorldModel focus state", () => {
  it("consumes focused window events into an application-to-window hierarchy", async () => {
    const bus = new InMemoryCommunicationBus();
    const model = new WorldModel({ now: () => "2026-08-23T00:00:01.000Z" });
    model.attach(bus);

    await bus.publish(
      message(
        "observer.window.focused",
        windowPayload(),
        "2026-08-23T00:00:00.000Z",
        "00000000-0000-4000-8000-000000000001",
      ),
    );

    expect(model.focus()).toEqual({
      active_application: { application_name: "Editor", process_id: 100 },
      focused_window: windowPayload(),
      updated_at: "2026-08-23T00:00:00.000Z",
      confidence: 1,
      correlation_id: "00000000-0000-4000-8000-000000000001",
    });
  });

  it("keeps only a bounded rolling transition window and handles title changes without content", async () => {
    const bus = new InMemoryCommunicationBus();
    const model = new WorldModel({ maxTransitions: 2 });
    model.attach(bus);

    await bus.publish(
      message(
        "observer.window.focused",
        windowPayload({ title: "Initial" }),
        "2026-08-23T00:00:00.000Z",
        "00000000-0000-4000-8000-000000000000",
      ),
    );
    for (const [index, title] of ["One", "Two", "Three"].entries()) {
      await bus.publish(
        message(
          "observer.window.title_changed",
          windowPayload({ title }),
          `2026-08-23T00:00:0${index + 1}.000Z`,
          `00000000-0000-4000-8000-00000000000${index + 1}`,
        ),
      );
    }

    expect(model.recentTransitions()).toHaveLength(2);
    expect(model.focus()?.focused_window?.title).toBe("Three");
    expect(model.focus()).not.toHaveProperty("window_contents");
    expect(model).not.toHaveProperty("persist");
  });

  it("clears focus when the focused window closes and preserves independent correlation", async () => {
    const bus = new InMemoryCommunicationBus();
    const model = new WorldModel();
    model.attach(bus);
    await bus.publish(
      message(
        "observer.window.focused",
        windowPayload(),
        "2026-08-23T00:00:00.000Z",
        "00000000-0000-4000-8000-000000000001",
      ),
    );
    await bus.publish(
      message(
        "observer.window.closed",
        windowPayload(),
        "2026-08-23T00:00:02.000Z",
        "00000000-0000-4000-8000-000000000002",
      ),
    );

    expect(model.focus()?.focused_window).toBeNull();
    expect(model.focus()?.active_application).toBeNull();
    expect(model.recentTransitions().at(-1)?.correlation_id).toBe(
      "00000000-0000-4000-8000-000000000002",
    );
  });
});
