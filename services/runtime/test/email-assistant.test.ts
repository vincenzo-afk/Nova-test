import { describe, expect, it, vi } from "vitest";
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
