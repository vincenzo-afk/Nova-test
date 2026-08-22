import { describe, expect, it } from "vitest";
import { LocalApiTokenIssuer, PublicApiServer } from "../src/rest-api.js";

const readJson = async (response: Response): Promise<Record<string, unknown>> =>
  (await response.json()) as Record<string, unknown>;

describe("PublicApiServer graph query endpoint", () => {
  it("queries the Knowledge Graph with explicit traversal parameters", async () => {
    const issuer = new LocalApiTokenIssuer();
    const token = issuer.issue(["memory.read"]);
    let received: unknown;
    const server = new PublicApiServer({
      tokenIssuer: issuer,
      handlers: {
        submitTask: async () => ({ task_id: "unused", state: "created" }),
        queryGraph: async (input) => {
          received = input;
          return {
            root: { id: "project-1", type: "Project", name: "Nova", properties: {}, active: true },
            nodes: [{ id: "tool-1", type: "Tool", name: "Git", properties: {}, active: true }],
            edges: [
              {
                id: "edge-1",
                type: "depends_on",
                from_node_id: "project-1",
                to_node_id: "tool-1",
                weight: 1,
              },
            ],
          };
        },
      },
    });
    await server.start();

    const response = await fetch(`${server.url()}/v1/graph/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "content-type": "application/json",
        "x-correlation-id": "d5b5d7a6-2b84-4c93-8d15-6c9376ad8f73",
      },
      body: JSON.stringify({
        node_id: "project-1",
        direction: "out",
        edge_type: "depends_on",
        depth: 2,
      }),
    });
    const body = await readJson(response);

    expect(response.status).toBe(200);
    expect(response.headers.get("x-correlation-id")).toBe("d5b5d7a6-2b84-4c93-8d15-6c9376ad8f73");
    expect(received).toEqual({
      node_id: "project-1",
      direction: "out",
      edge_type: "depends_on",
      depth: 2,
    });
    expect(body.root).toEqual({
      id: "project-1",
      type: "Project",
      name: "Nova",
      properties: {},
      active: true,
    });
    expect(body.edges).toEqual([
      {
        id: "edge-1",
        type: "depends_on",
        from_node_id: "project-1",
        to_node_id: "tool-1",
        weight: 1,
      },
    ]);
    await server.stop();
  });

  it("requires memory.read and validates graph query bounds", async () => {
    const issuer = new LocalApiTokenIssuer();
    const taskToken = issuer.issue(["task.read"]);
    const memoryToken = issuer.issue(["memory.read"]);
    const server = new PublicApiServer({
      tokenIssuer: issuer,
      handlers: {
        submitTask: async () => ({ task_id: "unused", state: "created" }),
        queryGraph: async () => ({ root: {}, nodes: [], edges: [] }),
      },
    });
    await server.start();

    const forbidden = await fetch(`${server.url()}/v1/graph/query`, {
      method: "POST",
      headers: { Authorization: `Bearer ${taskToken}`, "content-type": "application/json" },
      body: JSON.stringify({ node_id: "project-1" }),
    });
    const invalid = await fetch(`${server.url()}/v1/graph/query`, {
      method: "POST",
      headers: { Authorization: `Bearer ${memoryToken}`, "content-type": "application/json" },
      body: JSON.stringify({ node_id: "project-1", direction: "sideways", depth: 4 }),
    });

    expect(forbidden.status).toBe(403);
    expect(await readJson(forbidden)).toEqual({
      error: { code: "NOVA-SEC001", message: "The token lacks the memory.read scope." },
    });
    expect(invalid.status).toBe(400);
    expect((await readJson(invalid)).error).toEqual({
      code: "NOVA-TL003",
      message:
        "Graph query direction must be in, out, or both; depth must be an integer from 1 to 3.",
    });
    await server.stop();
  });
});
