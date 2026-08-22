import { describe, expect, it } from "vitest";
import { LocalApiTokenIssuer, PublicApiServer } from "../src/rest-api.js";

const readJson = async (response: Response): Promise<Record<string, unknown>> =>
  (await response.json()) as Record<string, unknown>;

describe("PublicApiServer tools endpoints", () => {
  it("lists registered tools with tools.read and opaque pagination", async () => {
    const issuer = new LocalApiTokenIssuer();
    const token = issuer.issue(["tools.read"]);
    const server = new PublicApiServer({
      tokenIssuer: issuer,
      handlers: {
        submitTask: async () => ({ task_id: "unused", state: "created" }),
        listTools: async () => [
          { tool_id: "files.read" },
          { tool_id: "memory.search" },
          { tool_id: "calendar.read" },
        ],
      },
    });
    await server.start();

    const first = await fetch(`${server.url()}/v1/tools?limit=2`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const firstBody = await readJson(first);
    expect(first.status).toBe(200);
    expect(firstBody.items).toEqual([{ tool_id: "files.read" }, { tool_id: "memory.search" }]);
    expect(firstBody.has_more).toBe(true);
    expect(typeof firstBody.next_cursor).toBe("string");

    const second = await fetch(
      `${server.url()}/v1/tools?cursor=${encodeURIComponent(String(firstBody.next_cursor))}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const secondBody = await readJson(second);
    expect(secondBody.items).toEqual([{ tool_id: "calendar.read" }]);
    expect(secondBody.has_more).toBe(false);
    await server.stop();
  });

  it("requires tools.register and routes a plugin tool registration", async () => {
    const issuer = new LocalApiTokenIssuer();
    const readToken = issuer.issue(["tools.read"]);
    const registerToken = issuer.issue(["tools.register"]);
    let registered: unknown;
    const server = new PublicApiServer({
      tokenIssuer: issuer,
      handlers: {
        submitTask: async () => ({ task_id: "unused", state: "created" }),
        registerTool: async (tool) => {
          registered = tool;
          return { tool_id: "plugin.echo", registered: true };
        },
      },
    });
    await server.start();
    const body = {
      tool_id: "plugin.echo",
      execution_tier: "internal_function",
      supported_actions: [],
    };

    const forbidden = await fetch(`${server.url()}/v1/tools/register`, {
      method: "POST",
      headers: { Authorization: `Bearer ${readToken}`, "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const allowed = await fetch(`${server.url()}/v1/tools/register`, {
      method: "POST",
      headers: { Authorization: `Bearer ${registerToken}`, "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    expect(forbidden.status).toBe(403);
    expect(allowed.status).toBe(201);
    expect(registered).toEqual(body);
    expect(await readJson(allowed)).toEqual({ tool_id: "plugin.echo", registered: true });
    await server.stop();
  });
});
