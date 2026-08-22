import { describe, expect, it } from "vitest";
import { LocalApiTokenIssuer, PublicApiServer } from "../src/rest-api.js";

const json = async (response: Response): Promise<Record<string, unknown>> =>
  (await response.json()) as Record<string, unknown>;

describe("PublicApiServer", () => {
  it("authenticates a local token, enforces task.submit, and propagates correlation_id", async () => {
    const issuer = new LocalApiTokenIssuer();
    const token = issuer.issue(["task.submit"]);
    const server = new PublicApiServer({
      tokenIssuer: issuer,
      handlers: {
        submitTask: async (input, correlationId) => ({
          task_id: "task-1",
          correlation_id: correlationId,
          state: "created",
          input,
        }),
      },
    });
    await server.start();

    const response = await fetch(`${server.url()}/v1/tasks`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "content-type": "application/json",
        "x-correlation-id": "00000000-0000-4000-8000-000000000020",
      },
      body: JSON.stringify({ goal: "status", priority: "interactive" }),
    });
    const body = await json(response);

    expect(response.status).toBe(202);
    expect(response.headers.get("x-nova-schema-version")).toBe("1.0.0");
    expect(body).toMatchObject({
      task_id: "task-1",
      correlation_id: "00000000-0000-4000-8000-000000000020",
      state: "created",
    });
    await server.stop();
  });

  it("rejects missing or insufficient scopes and applies per-token rate limiting", async () => {
    const issuer = new LocalApiTokenIssuer();
    const readOnly = issuer.issue(["memory.read"]);
    const server = new PublicApiServer({
      tokenIssuer: issuer,
      rateLimitPerMinute: 1,
      handlers: { submitTask: async () => ({ task_id: "task-2", state: "created" }) },
    });
    await server.start();

    const missing = await fetch(`${server.url()}/v1/tasks`, {
      method: "POST",
      body: JSON.stringify({ goal: "nope" }),
    });
    const insufficient = await fetch(`${server.url()}/v1/tasks`, {
      method: "POST",
      headers: { Authorization: `Bearer ${readOnly}`, "content-type": "application/json" },
      body: JSON.stringify({ goal: "nope" }),
    });
    expect(missing.status).toBe(401);
    expect(insufficient.status).toBe(403);

    const allowed = issuer.issue(["task.submit"]);
    const first = await fetch(`${server.url()}/v1/tasks`, {
      method: "POST",
      headers: { Authorization: `Bearer ${allowed}`, "content-type": "application/json" },
      body: JSON.stringify({ goal: "one" }),
    });
    const second = await fetch(`${server.url()}/v1/tasks`, {
      method: "POST",
      headers: { Authorization: `Bearer ${allowed}`, "content-type": "application/json" },
      body: JSON.stringify({ goal: "two" }),
    });
    expect(first.status).toBe(202);
    expect(second.status).toBe(429);
    await server.stop();
  });
});
