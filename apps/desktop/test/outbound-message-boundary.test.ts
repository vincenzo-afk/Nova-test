import { describe, expect, it } from "vitest";
import type { DeliveryReceipt, EmailSendReceipt } from "@nova/runtime";
import {
  projectChannelDeliveryReceipt,
  projectEmailSendReceipt,
} from "../src/main/response-projections.js";

describe("outbound message renderer boundary", () => {
  it("omits email body from the confirmed send receipt", () => {
    const receipt: EmailSendReceipt = {
      to: "person@example.com",
      subject: "Private subject",
      body: "Private message body",
      message_id: "message-1",
    };

    const projected = projectEmailSendReceipt(receipt);

    expect(projected).toEqual({ message_id: "message-1", sent: true });
    expect(JSON.stringify(projected)).not.toContain("Private message body");
    expect(JSON.stringify(projected)).not.toContain("person@example.com");
  });

  it("omits channel content from the confirmed delivery receipt", () => {
    const receipt: DeliveryReceipt = {
      message_id: "message-2",
      status: "sent",
      chat_id: "chat-1",
      content: "Private channel content",
    };

    const projected = projectChannelDeliveryReceipt(receipt);

    expect(projected).toEqual({ message_id: "message-2", status: "sent" });
    expect(JSON.stringify(projected)).not.toContain("Private channel content");
    expect(JSON.stringify(projected)).not.toContain("chat-1");
  });
});
