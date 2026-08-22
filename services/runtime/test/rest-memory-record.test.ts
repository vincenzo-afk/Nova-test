import { describe, expect, it } from "vitest";
import { LocalApiTokenIssuer, PublicApiServer } from "../src/rest-api.js";

const readJson = async (response: Response): Promise<Record<string, unknown>> =>
  (await response.json()) as Record<string, unknown>;

describe("PublicApiServer memory record endpoint", () => {
  it("fetches a memory record with lineage using memory.read", async () => {
    const issuer = new LocalApiTokenIssuer();
    const token = issuer.issue(["memory.read"]);
    const server = new PublicApiServer({
      tokenIssuer: issuer,
      handlers: {
        submitTask: async () => ({ task_id: "unused", state: "created" }),
        getMemoryRecord: async (recordId) => ({
          record_id: recordId,
          content_ref: "note://memory/123",
          lineage: [{ relation: "derived_from", source_record_id: "source-1" }],
        }),
      },
    });
    await server.start();

    const response = await fetch(`${server.url()}/v1/memory/record-123`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "x-correlation-id": "7d4c0f3f-9a1c-4a9f-9e7c-9c2cde1f60a1",
      },
    });
    const body = await readJson(response);

    expect(response.status).toBe(200);
    expect(response.headers.get("x-correlation-id")).toBe("7d4c0f3f-9a1c-4a9f-9e7c-9c2cde1f60a1");
    expect(body).toEqual({
      record_id: "record-123",
      content_ref: "note://memory/123",
      lineage: [{ relation: "derived_from", source_record_id: "source-1" }],
    });
    await server.stop();
  });

  it("requires memory.read and returns a typed not-found response", async () => {
    const issuer = new LocalApiTokenIssuer();
    const taskToken = issuer.issue(["task.read"]);
    const memoryToken = issuer.issue(["memory.read"]);
    const server = new PublicApiServer({
      tokenIssuer: issuer,
      handlers: {
        submitTask: async () => ({ task_id: "unused", state: "created" }),
        getMemoryRecord: async () => undefined,
      },
    });
    await server.start();

    const forbidden = await fetch(`${server.url()}/v1/memory/record-123`, {
      headers: { Authorization: `Bearer ${taskToken}` },
    });
    const missing = await fetch(`${server.url()}/v1/memory/record-123`, {
      headers: { Authorization: `Bearer ${memoryToken}` },
    });

    expect(forbidden.status).toBe(403);
    expect(await readJson(forbidden)).toEqual({
      error: { code: "NOVA-SEC001", message: "The token lacks the memory.read scope." },
    });
    expect(missing.status).toBe(404);
    expect(await readJson(missing)).toEqual({
      error: { code: "NOVA-MEM003", message: "Memory record not found." },
    });
    await server.stop();
  });
});
