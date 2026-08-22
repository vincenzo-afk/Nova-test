import { describe, expect, it } from "vitest";
import { LocalApiTokenIssuer, PublicApiServer } from "../src/rest-api.js";

const readJson = async (response: Response): Promise<unknown> => response.json();

describe("PublicApiServer permissions endpoints", () => {
  it("lists permission grants with config.read", async () => {
    const issuer = new LocalApiTokenIssuer();
    const token = issuer.issue(["config.read"]);
    const grants = [
      { source: "filesystem", granted: false },
      { source: "applications", granted: true },
    ];
    let correlationId = "";
    const server = new PublicApiServer({
      tokenIssuer: issuer,
      handlers: {
        submitTask: async () => ({ task_id: "unused", state: "created" }),
        listPermissions: async (receivedCorrelationId) => {
          correlationId = receivedCorrelationId;
          return grants;
        },
      },
    });
    await server.start();

    const response = await fetch(`${server.url()}/v1/permissions`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "x-correlation-id": "3a89b7da-7cbf-4f61-a20e-8c39a3436a31",
      },
    });

    expect(response.status).toBe(200);
    expect(correlationId).toBe("3a89b7da-7cbf-4f61-a20e-8c39a3436a31");
    expect(response.headers.get("x-correlation-id")).toBe(correlationId);
    expect(await readJson(response)).toEqual(grants);
    await server.stop();
  });

  it("updates a permission by source-as-grant_id with config.write", async () => {
    const issuer = new LocalApiTokenIssuer();
    const readToken = issuer.issue(["config.read"]);
    const writeToken = issuer.issue(["config.write"]);
    let received: unknown;
    const server = new PublicApiServer({
      tokenIssuer: issuer,
      handlers: {
        submitTask: async () => ({ task_id: "unused", state: "created" }),
        updatePermission: async (grantId, patch, correlationId) => {
          received = { grantId, patch, correlationId };
          return { source: grantId, granted: patch.granted };
        },
      },
    });
    await server.start();

    const forbidden = await fetch(`${server.url()}/v1/permissions/filesystem`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${readToken}`, "content-type": "application/json" },
      body: JSON.stringify({ granted: true }),
    });
    const allowed = await fetch(`${server.url()}/v1/permissions/filesystem`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${writeToken}`,
        "content-type": "application/json",
        "x-correlation-id": "8e9e83c2-d624-4c0c-9c55-8d815f65a201",
      },
      body: JSON.stringify({ granted: true }),
    });

    expect(forbidden.status).toBe(403);
    expect(allowed.status).toBe(200);
    expect(received).toEqual({
      grantId: "filesystem",
      patch: { granted: true },
      correlationId: "8e9e83c2-d624-4c0c-9c55-8d815f65a201",
    });
    expect(await readJson(allowed)).toEqual({ source: "filesystem", granted: true });
    await server.stop();
  });

  it("rejects a non-boolean permission patch", async () => {
    const issuer = new LocalApiTokenIssuer();
    const token = issuer.issue(["config.write"]);
    const server = new PublicApiServer({
      tokenIssuer: issuer,
      handlers: {
        submitTask: async () => ({ task_id: "unused", state: "created" }),
        updatePermission: async () => ({ source: "filesystem", granted: true }),
      },
    });
    await server.start();

    const response = await fetch(`${server.url()}/v1/permissions/filesystem`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ granted: "yes" }),
    });

    expect(response.status).toBe(400);
    expect(await readJson(response)).toEqual({
      error: {
        code: "NOVA-CFG001",
        message: "Permission patch must contain a boolean granted field.",
      },
    });
    await server.stop();
  });
});
