import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createMessage } from "../src/communication-bus.js";
import { NamedPipeCommunicationBus } from "../src/named-pipe-bus.js";

const resources: Array<{
  server: NamedPipeCommunicationBus;
  client: NamedPipeCommunicationBus;
  directory: string;
}> = [];

afterEach(async () => {
  await Promise.all(
    resources.splice(0).map(async ({ server, client, directory }) => {
      await client.close();
      await server.close();
      await rm(directory, { recursive: true, force: true });
    }),
  );
});

describe("NamedPipeCommunicationBus", () => {
  it("delivers an envelope from a client to server and server subscribers", async () => {
    const directory = await mkdtemp(join(tmpdir(), "nova-bus-"));
    const path = join(directory, "bus.sock");
    const server = new NamedPipeCommunicationBus({ path, role: "server" });
    const client = new NamedPipeCommunicationBus({ path, role: "client" });
    resources.push({ server, client, directory });
    const received: string[] = [];
    server.subscribe("test.topic", async (message) => {
      received.push(message.payload as string);
    });

    await server.start();
    await client.start();
    const result = await client.publish(
      createMessage({
        topic: "test.topic",
        schema_version: "1.0.0",
        correlation_id: "00000000-0000-4000-8000-000000000001",
        source_service: "test-client",
        payload: "hello",
      }),
    );

    expect(result).toMatchObject({ ok: true });
    await expect.poll(() => received).toEqual(["hello"]);
  });

  it("rejects publish before a client connects and accepts subscribers on both ends", async () => {
    const directory = await mkdtemp(join(tmpdir(), "nova-bus-"));
    const path = join(directory, "bus.sock");
    const server = new NamedPipeCommunicationBus({ path, role: "server" });
    const client = new NamedPipeCommunicationBus({ path, role: "client" });
    resources.push({ server, client, directory });

    const beforeConnect = await client.publish(
      createMessage({
        topic: "test.topic",
        schema_version: "1.0.0",
        correlation_id: "00000000-0000-4000-8000-000000000002",
        source_service: "test-client",
        payload: "nope",
      }),
    );
    expect(beforeConnect).toMatchObject({ ok: false, error: { code: "NOVA-EVT002" } });

    await server.start();
    await client.start();
    const serverReceived: string[] = [];
    const clientReceived: string[] = [];
    server.subscribe("test.topic", async (message) => {
      serverReceived.push(message.payload as string);
    });
    client.subscribe("test.topic", async (message) => {
      clientReceived.push(message.payload as string);
    });
    await server.publish(
      createMessage({
        topic: "test.topic",
        schema_version: "1.0.0",
        correlation_id: "00000000-0000-4000-8000-000000000003",
        source_service: "server",
        payload: "broadcast",
      }),
    );

    await expect.poll(() => serverReceived).toEqual(["broadcast"]);
    await expect.poll(() => clientReceived).toEqual(["broadcast"]);
  });
});
