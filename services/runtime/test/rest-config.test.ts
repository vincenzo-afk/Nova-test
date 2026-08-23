import { describe, expect, it } from "vitest";
import { LocalApiTokenIssuer, PublicApiServer } from "../src/rest-api.js";

const readJson = async (response: Response): Promise<unknown> => response.json();

const configuration = {
  schema_version: "1.0.0",
  capabilities: { llm: { provider_id: "local.llm" } },
  devices: [],
  channels: [],
  plugins: [],
  mcp_servers: [],
  routing_policies: {},
  permissions: {},
  voice: { enabled: true },
  personalization: { preferences: [] },
};

describe("PublicApiServer configuration endpoints", () => {
  it("returns the full configuration with config.read", async () => {
    const issuer = new LocalApiTokenIssuer();
    const token = issuer.issue(["config.read"]);
    let correlationId = "";
    const server = new PublicApiServer({
      tokenIssuer: issuer,
      handlers: {
        submitTask: async () => ({ task_id: "unused", state: "created" }),
        getConfig: async (receivedCorrelationId) => {
          correlationId = receivedCorrelationId;
          return configuration;
        },
      },
    });
    await server.start();

    const response = await fetch(`${server.url()}/v1/config`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "x-correlation-id": "d20faeaf-49ce-41ba-b0b1-03b2f4198b4d",
      },
    });

    expect(response.status).toBe(200);
    expect(correlationId).toBe("d20faeaf-49ce-41ba-b0b1-03b2f4198b4d");
    expect(response.headers.get("x-correlation-id")).toBe(correlationId);
    expect(await readJson(response)).toEqual(configuration);
    await server.stop();
  });

  it("updates one configuration section with config.write", async () => {
    const issuer = new LocalApiTokenIssuer();
    const readToken = issuer.issue(["config.read"]);
    const writeToken = issuer.issue(["config.write"]);
    let received: unknown;
    const server = new PublicApiServer({
      tokenIssuer: issuer,
      handlers: {
        submitTask: async () => ({ task_id: "unused", state: "created" }),
        updateConfig: async (input, correlationId) => {
          received = { input, correlationId };
          return { ...configuration, voice: input.value };
        },
      },
    });
    await server.start();
    const body = { section: "voice", value: { enabled: false } };

    const forbidden = await fetch(`${server.url()}/v1/config`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${readToken}`, "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const allowed = await fetch(`${server.url()}/v1/config`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${writeToken}`,
        "content-type": "application/json",
        "x-correlation-id": "0b5e341f-cf5e-48e0-93ae-3d44f21d0b8b",
      },
      body: JSON.stringify(body),
    });

    expect(forbidden.status).toBe(403);
    expect(allowed.status).toBe(200);
    expect(received).toEqual({
      input: body,
      correlationId: "0b5e341f-cf5e-48e0-93ae-3d44f21d0b8b",
    });
    expect(await readJson(allowed)).toEqual({ ...configuration, voice: { enabled: false } });
    await server.stop();
  });

  it("rejects an unknown configuration section", async () => {
    const issuer = new LocalApiTokenIssuer();
    const token = issuer.issue(["config.write"]);
    const server = new PublicApiServer({
      tokenIssuer: issuer,
      handlers: {
        submitTask: async () => ({ task_id: "unused", state: "created" }),
        updateConfig: async () => configuration,
      },
    });
    await server.start();

    const response = await fetch(`${server.url()}/v1/config`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ section: "unknown", value: {} }),
    });

    expect(response.status).toBe(400);
    expect(await readJson(response)).toEqual({
      error: { code: "NOVA-CFG001", message: "Configuration section is invalid." },
    });
    await server.stop();
  });
});
