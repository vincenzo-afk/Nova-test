import { afterEach, describe, expect, it } from "vitest";
import WebSocket from "ws";
import { InMemoryCommunicationBus, createMessage, type MessageEnvelope } from "@nova/shared";
import { LocalApiTokenIssuer } from "../src/rest-api.js";
import { CommunicationBusEventJournal, PublicWebSocketServer } from "../src/websocket-api.js";

const sockets: WebSocket[] = [];
const servers: PublicWebSocketServer[] = [];

afterEach(async () => {
  for (const socket of sockets.splice(0)) socket.close();
  await Promise.all(servers.splice(0).map((server) => server.stop()));
});

const connect = async (url: string, token: string): Promise<WebSocket> =>
  new Promise((resolve, reject) => {
    const socket = new WebSocket(url, { headers: { Authorization: `Bearer ${token}` } });
    sockets.push(socket);
    socket.once("open", () => resolve(socket));
    socket.once("unexpected-response", (_request, response) => {
      reject(new Error(`Unexpected HTTP ${response.statusCode}.`));
    });
    socket.once("error", reject);
  });

const nextMessage = async (socket: WebSocket): Promise<unknown> =>
  new Promise((resolve, reject) => {
    const onMessage = (data: WebSocket.RawData) => {
      cleanup();
      resolve(JSON.parse(data.toString()) as unknown);
    };
    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };
    const cleanup = () => {
      socket.off("message", onMessage);
      socket.off("error", onError);
    };
    socket.once("message", onMessage);
    socket.once("error", onError);
  });

const event = (topic: string, correlationId: string): MessageEnvelope =>
  createMessage({
    topic,
    schema_version: "1.0.0",
    correlation_id: correlationId,
    source_service: "test-runtime",
    payload: { state: "completed" },
  });

describe("PublicWebSocketServer", () => {
  it("authenticates, subscribes, forwards live bus events, and unsubscribes", async () => {
    const issuer = new LocalApiTokenIssuer();
    const token = issuer.issue(["task.read"]);
    const journal = new CommunicationBusEventJournal(new InMemoryCommunicationBus());
    const server = new PublicWebSocketServer({
      tokenIssuer: issuer,
      events: journal,
      authorizeTopics: ({ topics }) => topics.every((topic) => topic === "task.progress"),
    });
    servers.push(server);
    await server.start();
    const socket = await connect(server.url(), token);

    socket.send(JSON.stringify({ action: "subscribe", topics: ["task.progress"] }));
    expect(await nextMessage(socket)).toEqual({ action: "subscribed", topics: ["task.progress"] });

    const live = event("task.progress", "c9a4e742-0c6a-41d3-aa8c-fb33db93a9d7");
    await journal.publish(live);
    expect(await nextMessage(socket)).toEqual(live);

    socket.send(JSON.stringify({ action: "unsubscribe", topics: ["task.progress"] }));
    expect(await nextMessage(socket)).toEqual({
      action: "unsubscribed",
      topics: ["task.progress"],
    });
    await journal.publish(event("task.progress", "2b76b0ec-a9ab-4be1-bded-bd18cbe5e94c"));
    await new Promise((resolve) => setTimeout(resolve, 25));
    expect(socket.readyState).toBe(WebSocket.OPEN);
  });

  it("replays journaled events after a message cursor and rejects unauthorized topics", async () => {
    const issuer = new LocalApiTokenIssuer();
    const token = issuer.issue(["task.read"]);
    const journal = new CommunicationBusEventJournal(new InMemoryCommunicationBus());
    const first = event("task.progress", "b96e1879-13f7-4c76-852d-e99b09b4df64");
    const second = event("task.progress", "1a72e8ac-711d-47e4-93fa-c6d655efed9f");
    await journal.publish(first);
    await journal.publish(second);
    const server = new PublicWebSocketServer({
      tokenIssuer: issuer,
      events: journal,
      authorizeTopics: ({ topics }) => topics.every((topic) => topic === "task.progress"),
    });
    servers.push(server);
    await server.start();
    const socket = await connect(server.url(), token);

    socket.send(JSON.stringify({ action: "subscribe", topics: ["system.status"] }));
    expect(await nextMessage(socket)).toEqual({
      error: {
        code: "NOVA-SEC001",
        message: "The token is not authorized for one or more topics.",
      },
    });
    socket.send(JSON.stringify({ action: "subscribe", topics: ["task.progress"] }));
    expect(await nextMessage(socket)).toEqual({ action: "subscribed", topics: ["task.progress"] });
    socket.send(JSON.stringify({ action: "replay", from_message_id: first.message_id }));
    expect(await nextMessage(socket)).toEqual(second);
  });

  it("rejects unauthenticated handshakes", async () => {
    const issuer = new LocalApiTokenIssuer();
    const journal = new CommunicationBusEventJournal(new InMemoryCommunicationBus());
    const server = new PublicWebSocketServer({
      tokenIssuer: issuer,
      events: journal,
      authorizeTopics: () => true,
    });
    servers.push(server);
    await server.start();

    await expect(
      new Promise<void>((resolve, reject) => {
        const socket = new WebSocket(server.url());
        sockets.push(socket);
        socket.once("unexpected-response", (_request, response) => {
          if (response.statusCode === 401) resolve();
          else reject(new Error(`Expected 401, received ${response.statusCode}.`));
        });
        socket.once("error", () => undefined);
      }),
    ).resolves.toBeUndefined();
  });
});
