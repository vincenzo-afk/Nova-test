import { describe, expect, it } from "vitest";
import { LocalApiTokenIssuer, PublicApiServer } from "../src/rest-api.js";

const readJson = async (response: Response): Promise<Record<string, unknown>> =>
  (await response.json()) as Record<string, unknown>;

describe("PublicApiServer search endpoint", () => {
  it("validates and routes a memory search with memory.read scope", async () => {
    const issuer = new LocalApiTokenIssuer();
    const token = issuer.issue(["memory.read"]);
    let received: unknown;
    let receivedCorrelation = "";
    const server = new PublicApiServer({
      tokenIssuer: issuer,
      handlers: {
        submitTask: async () => ({ task_id: "unused", state: "created" }),
        search: async (input, correlationId) => {
          received = input;
          receivedCorrelation = correlationId;
          return { results: [{ id: "memory-1", score: 0.9 }], query: input.query };
        },
      },
    });
    await server.start();

    const correlationId = "00000000-0000-4000-8000-000000000021";
    const response = await fetch(`${server.url()}/v1/search`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "content-type": "application/json",
        "x-correlation-id": correlationId,
      },
      body: JSON.stringify({
        query: "deployment",
        filters: { project: "nova", entity_type: "Task" },
      }),
    });
    const body = await readJson(response);

    expect(response.status).toBe(200);
    expect(received).toEqual({
      query: "deployment",
      filters: { project: "nova", entity_type: "Task" },
    });
    expect(receivedCorrelation).toBe(correlationId);
    expect(body).toMatchObject({ results: [{ id: "memory-1" }], query: "deployment" });
    await server.stop();
  });

  it("rejects insufficient scope and malformed search input", async () => {
    const issuer = new LocalApiTokenIssuer();
    const taskToken = issuer.issue(["task.read"]);
    const memoryToken = issuer.issue(["memory.read"]);
    const server = new PublicApiServer({
      tokenIssuer: issuer,
      handlers: {
        submitTask: async () => ({ task_id: "unused", state: "created" }),
        search: async () => ({ results: [] }),
      },
    });
    await server.start();

    const forbidden = await fetch(`${server.url()}/v1/search`, {
      method: "POST",
      headers: { Authorization: `Bearer ${taskToken}`, "content-type": "application/json" },
      body: JSON.stringify({ query: "nope" }),
    });
    const invalid = await fetch(`${server.url()}/v1/search`, {
      method: "POST",
      headers: { Authorization: `Bearer ${memoryToken}`, "content-type": "application/json" },
      body: JSON.stringify({ query: "" }),
    });
    expect(forbidden.status).toBe(403);
    expect(invalid.status).toBe(400);
    await server.stop();
  });
});
