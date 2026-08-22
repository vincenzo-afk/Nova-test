import { describe, expect, it } from "vitest";
import { LocalApiTokenIssuer, PublicApiServer } from "../src/rest-api.js";

const readJson = async (response: Response): Promise<Record<string, unknown>> =>
  (await response.json()) as Record<string, unknown>;

describe("PublicApiServer task lifecycle endpoints", () => {
  it("supports status lookup and cancellation with independent scopes", async () => {
    const issuer = new LocalApiTokenIssuer();
    const submitToken = issuer.issue(["task.submit"]);
    const readToken = issuer.issue(["task.read"]);
    const cancelToken = issuer.issue(["task.cancel"]);
    let cancelled = false;
    const server = new PublicApiServer({
      tokenIssuer: issuer,
      handlers: {
        submitTask: async () => ({ task_id: "task-1", state: "created" }),
        cancelTask: async (taskId) => {
          cancelled = taskId === "task-1";
          return { task_id: taskId, state: "cancelled" };
        },
      },
    });
    await server.start();
    const base = `${server.url()}/v1/tasks`;
    await fetch(base, {
      method: "POST",
      headers: { Authorization: `Bearer ${submitToken}`, "content-type": "application/json" },
      body: JSON.stringify({ goal: "prepare" }),
    });

    const status = await fetch(`${base}/task-1`, {
      headers: { Authorization: `Bearer ${readToken}` },
    });
    expect(status.status).toBe(200);
    expect(await readJson(status)).toMatchObject({ task_id: "task-1", state: "created" });

    const forbidden = await fetch(`${base}/task-1/cancel`, {
      method: "POST",
      headers: { Authorization: `Bearer ${submitToken}` },
    });
    expect(forbidden.status).toBe(403);
    const cancelledResponse = await fetch(`${base}/task-1/cancel`, {
      method: "POST",
      headers: { Authorization: `Bearer ${cancelToken}` },
    });
    expect(cancelledResponse.status).toBe(202);
    expect(cancelled).toBe(true);
    await server.stop();
  });

  it("lists tasks with opaque cursor pagination and clamps oversized limits", async () => {
    const issuer = new LocalApiTokenIssuer();
    const token = issuer.issue(["task.submit", "task.read"]);
    let sequence = 0;
    const server = new PublicApiServer({
      tokenIssuer: issuer,
      handlers: { submitTask: async () => ({ task_id: `task-${++sequence}`, state: "created" }) },
    });
    await server.start();
    const base = `${server.url()}/v1/tasks`;
    for (let i = 0; i < 3; i += 1) {
      await fetch(base, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({ goal: `task-${i}` }),
      });
    }

    const first = await fetch(`${base}?limit=2`, { headers: { Authorization: `Bearer ${token}` } });
    const firstBody = await readJson(first);
    expect(first.status).toBe(200);
    expect(firstBody.items).toHaveLength(2);
    expect(firstBody.has_more).toBe(true);
    expect(typeof firstBody.next_cursor).toBe("string");

    const second = await fetch(
      `${base}?limit=999&cursor=${encodeURIComponent(String(firstBody.next_cursor))}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const secondBody = await readJson(second);
    expect(second.status).toBe(200);
    expect(secondBody.items).toHaveLength(1);
    expect(secondBody.next_cursor).toBeNull();
    expect(secondBody.has_more).toBe(false);
    await server.stop();
  });
});
