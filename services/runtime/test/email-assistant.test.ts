import { MemoryLogSink, StructuredLogger } from "@nova/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EmailAssistant, type EmailProvider } from "../src/email-assistant.js";

const provider: EmailProvider = {
  read: vi.fn(async () => [
    {
      id: "mail-1",
      sender: "alice@example.com",
      subject: "Hello",
      body: "Message",
      attachments: [],
    },
  ]),
  send: vi.fn(async (draft) => ({ message_id: "sent-1", ...draft })),
};

describe("EmailAssistant", () => {
  beforeEach(() => vi.clearAllMocks());

  it("emits bounded read diagnostics without logging email content or identifiers", async () => {
    const sink = new MemoryLogSink();
    const assistant = new EmailAssistant(provider, {
      logger: new StructuredLogger({ service: "runtime.email", sink }),
    });

    expect(await assistant.read({ from: "alice@example.com" })).toMatchObject({ ok: true });
    expect(sink.records().at(-1)?.event).toBe("email.read.completed");
    expect(sink.records().at(-1)?.details).toMatchObject({ message_count: 1 });
    expect(JSON.stringify(sink.records())).not.toContain("alice@example.com");
    expect(JSON.stringify(sink.records())).not.toContain("Hello");
    expect(JSON.stringify(sink.records())).not.toContain("Message");
    expect(JSON.stringify(sink.records())).not.toContain("mail-1");
  });

  it("emits a bounded denial diagnostic before an unconfirmed irreversible send", async () => {
    const sink = new MemoryLogSink();
    const assistant = new EmailAssistant(provider, {
      logger: new StructuredLogger({ service: "runtime.email", sink }),
    });
    const draft = { to: "bob@example.com", subject: "Private", body: "Sensitive body" };

    expect(await assistant.send(draft, false)).toMatchObject({
      ok: false,
      error: { code: "NOVA-SEC001" },
    });
    expect(sink.records().at(-1)?.event).toBe("email.send.rejected");
    expect(sink.records().at(-1)?.details).toMatchObject({ reason: "confirmation_required" });
    expect(JSON.stringify(sink.records())).not.toContain("bob@example.com");
    expect(JSON.stringify(sink.records())).not.toContain("Sensitive body");
  });

  it("audits provider failures without logging provider exception text", async () => {
    const sink = new MemoryLogSink();
    const failing: EmailProvider = {
      read: vi.fn(async () => {
        throw new Error("provider secret response");
      }),
      send: provider.send,
    };
    const assistant = new EmailAssistant(failing, {
      logger: new StructuredLogger({ service: "runtime.email", sink }),
    });

    expect(await assistant.read({})).toMatchObject({
      ok: false,
      error: { code: "NOVA-AI002" },
    });
    expect(sink.records().at(-1)?.event).toBe("email.read.failed");
    expect(sink.records().at(-1)?.details).toMatchObject({ reason: "provider_failure" });
    expect(JSON.stringify(sink.records())).not.toContain("provider secret response");
  });

  it("returns structured email context for read access", async () => {
    const assistant = new EmailAssistant(provider);

    expect(await assistant.read({ from: "alice@example.com" })).toMatchObject({
      ok: true,
      value: [{ id: "mail-1", sender: "alice@example.com" }],
    });
  });

  it("creates a full draft and refuses irreversible send without confirmation", async () => {
    const assistant = new EmailAssistant(provider);
    const draft = assistant.draft({ to: "bob@example.com", subject: "Update", body: "Hello Bob" });

    expect(draft).toMatchObject({
      ok: true,
      value: { to: "bob@example.com", subject: "Update", body: "Hello Bob" },
    });
    expect(
      await assistant.send(draft.ok ? draft.value : { to: "", subject: "", body: "" }, false),
    ).toMatchObject({ ok: false, error: { code: "NOVA-SEC001" } });
    expect(provider.send).not.toHaveBeenCalled();
  });

  it("audits exact automation-rule authorization without logging recipient or subject", async () => {
    const sink = new MemoryLogSink();
    const assistant = new EmailAssistant(provider, {
      logger: new StructuredLogger({ service: "runtime.email", sink }),
    });
    const draft = { to: "bob@example.com", subject: "Update", body: "Hello Bob" };
    assistant.addAutomationRule({ to: draft.to, subject: draft.subject });

    expect(await assistant.send(draft, false)).toMatchObject({ ok: true });
    expect(sink.records().at(-1)?.event).toBe("email.send.completed");
    expect(sink.records().at(-1)?.details).toMatchObject({
      confirmed: false,
      automation_rule: true,
    });
    expect(JSON.stringify(sink.records())).not.toContain("bob@example.com");
    expect(JSON.stringify(sink.records())).not.toContain("Hello Bob");
  });

  it("sends only after explicit confirmation or an exact configured automation rule", async () => {
    const assistant = new EmailAssistant(provider);
    const draft = { to: "bob@example.com", subject: "Update", body: "Hello Bob" };

    expect(await assistant.send(draft, true)).toMatchObject({
      ok: true,
      value: { message_id: "sent-1" },
    });
    assistant.addAutomationRule({ to: "bob@example.com", subject: "Update" });
    expect(await assistant.send(draft, false)).toMatchObject({
      ok: true,
      value: { message_id: "sent-1" },
    });
    expect(provider.send).toHaveBeenCalledTimes(2);
  });
});
