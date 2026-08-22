import { describe, expect, it } from "vitest";
import { WebhookManager } from "../src/webhook-manager.js";
import { LocalApiTokenIssuer, PublicApiServer } from "../src/rest-api.js";

const readJson = async (response: Response): Promise<unknown> => response.json();

describe("PublicApiServer event subscription endpoint", () => {
  it("registers a webhook through the real callback contract", async () => {
    const issuer = new LocalApiTokenIssuer();
    const token = issuer.issue(["network.external"]);
    let received: unknown;
    const webhookManager = new WebhookManager({ send: async () => undefined });
    const server = new PublicApiServer({
      tokenIssuer: issuer,
      handlers: {
        submitTask: async () => ({ task_id: "unused", state: "created" }),
        registerWebhook: async (input, correlationId) => {
          received = { input, correlationId };
          return webhookManager.register(input);
        },
      },
    });
    await server.start();

    const response = await fetch(`${server.url()}/v1/events/subscribe`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "content-type": "application/json",
        "x-correlation-id": "5adfbdb0-9e9d-45c8-8e0d-fd2bcb49c62e",
      },
      body: JSON.stringify({
        url: "https://example.test/nova-events",
        topics: ["task.progress", "system.status"],
      }),
    });

    expect(response.status).toBe(201);
    expect(response.headers.get("x-correlation-id")).toBe("5adfbdb0-9e9d-45c8-8e0d-fd2bcb49c62e");
    expect(received).toEqual({
      input: {
        url: "https://example.test/nova-events",
        topics: ["task.progress", "system.status"],
      },
      correlationId: "5adfbdb0-9e9d-45c8-8e0d-fd2bcb49c62e",
    });
    expect(await readJson(response)).toMatchObject({
      id: expect.stringMatching(/^webhook-/),
      secret: expect.stringMatching(/^[a-f0-9]{64}$/),
      status: "healthy",
      failure_count: 0,
    });
    await server.stop();
  });

  it("requires network.external and rejects invalid registration input", async () => {
    const issuer = new LocalApiTokenIssuer();
    const readToken = issuer.issue(["config.read"]);
    const networkToken = issuer.issue(["network.external"]);
    const server = new PublicApiServer({
      tokenIssuer: issuer,
      handlers: {
        submitTask: async () => ({ task_id: "unused", state: "created" }),
        registerWebhook: async () => ({ id: "unused" }),
      },
    });
    await server.start();

    const forbidden = await fetch(`${server.url()}/v1/events/subscribe`, {
      method: "POST",
      headers: { Authorization: `Bearer ${readToken}`, "content-type": "application/json" },
      body: JSON.stringify({ url: "https://example.test/events", topics: ["task.progress"] }),
    });
    const invalid = await fetch(`${server.url()}/v1/events/subscribe`, {
      method: "POST",
      headers: { Authorization: `Bearer ${networkToken}`, "content-type": "application/json" },
      body: JSON.stringify({ url: "file:///tmp/events", topics: [] }),
    });

    expect(forbidden.status).toBe(403);
    expect(await readJson(forbidden)).toEqual({
      error: { code: "NOVA-SEC001", message: "The token lacks the network.external scope." },
    });
    expect(invalid.status).toBe(400);
    expect(await readJson(invalid)).toEqual({
      error: {
        code: "NOVA-EVT002",
        message: "Webhook URL must use http or https and topics must be non-empty.",
      },
    });
    await server.stop();
  });
});
