import { afterEach, describe, expect, it, vi } from "vitest";
import { createMessage, err, ok, type MessageEnvelope } from "@nova/shared";
import {
  ObservationIndexer,
  type ObservationMemoryWriter,
  type SupportedObservationEvent,
} from "../src/observation-indexer.js";

const event = (topic: SupportedObservationEvent["topic"], payload: unknown): MessageEnvelope =>
  createMessage({
    topic,
    schema_version: "1.0.0",
    correlation_id: "00000000-0000-4000-8000-000000000001",
    source_service: "observer.windows",
    payload,
  });

const writer = (): ObservationMemoryWriter & {
  readonly writeWorking: ReturnType<typeof vi.fn>;
} => ({
  writeWorking: vi.fn(async () => ok({ id: "working-1" })),
});

afterEach(() => vi.restoreAllMocks());

describe("ObservationIndexer", () => {
  it("keeps events ephemeral when no task context is explicitly supplied", async () => {
    const memory = writer();
    const indexer = new ObservationIndexer(memory);

    const result = await indexer.index({
      event: event("observer.window.focused", {
        window: {
          window_id: "hwnd:42",
          process_id: 100,
          application_name: "Editor",
          title: "Notes.txt",
          monitor_id: "DISPLAY1",
          virtual_desktop_id: "desktop-1",
          z_order: 0,
        },
      }),
    });

    expect(result).toEqual({ ok: true, value: { persisted: false, reason: "no_task_context" } });
    expect(memory.writeWorking).not.toHaveBeenCalled();
  });

  it("writes a redacted normalized window observation to Working Memory for an explicit task", async () => {
    const memory = writer();
    const indexer = new ObservationIndexer(memory);

    const result = await indexer.index({
      task_id: "task-1",
      event: event("observer.window.focused", {
        window: {
          window_id: "hwnd:42",
          process_id: 100,
          application_name: "Editor",
          title: "Notes.txt",
          monitor_id: "DISPLAY1",
          virtual_desktop_id: "desktop-1",
          z_order: 0,
          window_contents: "PRIVATE CONTENT MUST NOT PERSIST",
          file_path: "C:\\Users\\secret\\Notes.txt",
        },
      }),
    });

    expect(result).toMatchObject({ ok: true, value: { persisted: true, memory_id: "working-1" } });
    const input = memory.writeWorking.mock.calls[0]?.[0] as {
      readonly taskId: string;
      readonly contentRef: string;
      readonly schemaVersion: string;
    };
    const normalized = JSON.parse(input.contentRef) as Record<string, unknown>;
    expect(input.taskId).toBe("task-1");
    expect(input.schemaVersion).toBe("1.0.0");
    expect(normalized).toMatchObject({
      topic: "observer.window.focused",
      correlation_id: "00000000-0000-4000-8000-000000000001",
      window: {
        process_id: 100,
        application_name: "Editor",
        title: "Notes.txt",
        monitor_id: "DISPLAY1",
        virtual_desktop_id: "desktop-1",
        z_order: 0,
      },
    });
    expect(input.contentRef).not.toContain("PRIVATE CONTENT MUST NOT PERSIST");
    expect(input.contentRef).not.toContain("C:\\\\Users\\\\secret");
    expect(input.contentRef).not.toContain("window_id");
  });

  it("indexes task-bound clipboard metadata without persisting unapproved content", async () => {
    const memory = writer();
    const indexer = new ObservationIndexer(memory);

    const result = await indexer.index({
      task_id: "task-1",
      event: event("observer.clipboard.changed" as SupportedObservationEvent["topic"], {
        entity_ref: "clipboard",
        content_type: "text",
        source_application: "Notepad",
        capture_level: "metadata",
        content_bytes: 19,
        content: "PRIVATE CONTENT MUST NOT PERSIST",
        excluded_reason: "content_permission_missing",
      }),
    });

    expect(result).toMatchObject({ ok: true, value: { persisted: true, memory_id: "working-1" } });
    const input = memory.writeWorking.mock.calls[0]?.[0] as { readonly contentRef: string };
    const normalized = JSON.parse(input.contentRef) as Record<string, unknown>;
    expect(normalized).toMatchObject({
      topic: "observer.clipboard.changed",
      clipboard: {
        content_type: "text",
        source_application: "Notepad",
        capture_level: "metadata",
        content_bytes: 19,
        excluded_reason: "content_permission_missing",
      },
    });
    expect(input.contentRef).not.toContain("PRIVATE CONTENT MUST NOT PERSIST");
  });

  it("indexes explicitly captured ordinary clipboard content for an explicit task", async () => {
    const memory = writer();
    const indexer = new ObservationIndexer(memory);

    const result = await indexer.index({
      task_id: "task-1",
      event: event("observer.clipboard.changed" as SupportedObservationEvent["topic"], {
        entity_ref: "clipboard",
        content_type: "text",
        source_application: "Notepad",
        capture_level: "content",
        content_bytes: 19,
        content: "private copied text",
      }),
    });

    expect(result).toMatchObject({ ok: true, value: { persisted: true, memory_id: "working-1" } });
    const input = memory.writeWorking.mock.calls[0]?.[0] as { readonly contentRef: string };
    expect(input.contentRef).toContain("private copied text");
  });

  it("indexes task-bound notification metadata without persisting an unapproved body", async () => {
    const memory = writer();
    const indexer = new ObservationIndexer(memory);

    const result = await indexer.index({
      task_id: "task-1",
      event: event("observer.notification.received" as SupportedObservationEvent["topic"], {
        entity_ref: "notification",
        source_application: "Build Runner",
        title: "Build complete",
        capture_level: "metadata",
        body_bytes: 12,
        body: "PRIVATE BODY MUST NOT PERSIST",
        excluded_reason: "content_permission_missing",
      }),
    });

    expect(result).toMatchObject({ ok: true, value: { persisted: true, memory_id: "working-1" } });
    const input = memory.writeWorking.mock.calls[0]?.[0] as { readonly contentRef: string };
    const normalized = JSON.parse(input.contentRef) as Record<string, unknown>;
    expect(normalized).toMatchObject({
      topic: "observer.notification.received",
      notification: {
        source_application: "Build Runner",
        title: "Build complete",
        capture_level: "metadata",
        body_bytes: 12,
        excluded_reason: "content_permission_missing",
      },
    });
    expect(input.contentRef).not.toContain("PRIVATE BODY MUST NOT PERSIST");
  });

  it("indexes explicitly captured ordinary notification bodies for an explicit task", async () => {
    const memory = writer();
    const indexer = new ObservationIndexer(memory);

    const result = await indexer.index({
      task_id: "task-1",
      event: event("observer.notification.received" as SupportedObservationEvent["topic"], {
        entity_ref: "notification",
        source_application: "Build Runner",
        title: "Build complete",
        capture_level: "content",
        body_bytes: 12,
        body: "Tests passed",
      }),
    });

    expect(result).toMatchObject({ ok: true, value: { persisted: true, memory_id: "working-1" } });
    const input = memory.writeWorking.mock.calls[0]?.[0] as { readonly contentRef: string };
    expect(input.contentRef).toContain("Tests passed");
  });

  it("rejects a notification body marked as sensitive when content capture is claimed", async () => {
    const memory = writer();
    const indexer = new ObservationIndexer(memory);

    const result = await indexer.index({
      task_id: "task-1",
      event: event("observer.notification.received" as SupportedObservationEvent["topic"], {
        entity_ref: "notification",
        source_application: "Authenticator",
        title: "Verification code",
        capture_level: "content",
        body_bytes: 6,
        body: "123456",
        excluded_reason: "sensitive_source",
      }),
    });

    expect(result).toMatchObject({ ok: false, error: { code: "NOVA-TL002" } });
    expect(memory.writeWorking).not.toHaveBeenCalled();
  });

  it("returns storage failures without pretending indexing succeeded", async () => {
    const memory: ObservationMemoryWriter = {
      writeWorking: async () =>
        err({
          code: "NOVA-MEM001",
          message: "disk unavailable",
          retryable: true,
        }),
    };
    const indexer = new ObservationIndexer(memory);

    const result = await indexer.index({
      task_id: "task-1",
      event: event("observer.application.launched", {
        application: { process_id: 100, application_name: "Editor" },
      }),
    });

    expect(result).toEqual({
      ok: false,
      error: { code: "NOVA-MEM001", message: "disk unavailable", retryable: true },
    });
  });
});
