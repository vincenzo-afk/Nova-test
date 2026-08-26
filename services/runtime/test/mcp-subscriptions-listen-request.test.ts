import { describe, expect, it } from "vitest";
import { McpSubscriptionsListenRequestBuilder } from "../src/mcp-subscriptions-listen-request.js";

describe("McpSubscriptionsListenRequestBuilder", () => {
  it("builds a fixed subscriptions/listen request with a bounded notification filter", () => {
    const builder = new McpSubscriptionsListenRequestBuilder();

    expect(
      builder.create({
        toolsListChanged: true,
        promptsListChanged: false,
        resourcesListChanged: true,
        resourceSubscriptions: ["file:///project/config.json"],
      }),
    ).toEqual({
      ok: true,
      value: {
        jsonrpc: "2.0",
        id: 1,
        method: "subscriptions/listen",
        params: {
          notifications: {
            toolsListChanged: true,
            promptsListChanged: false,
            resourcesListChanged: true,
            resourceSubscriptions: ["file:///project/config.json"],
          },
        },
      },
    });
  });

  it("clones subscriptions and omits unrequested filter fields", () => {
    const builder = new McpSubscriptionsListenRequestBuilder();
    const resourceSubscriptions = ["https://example.test/resource"];
    const result = builder.create({ resourceSubscriptions });
    resourceSubscriptions[0] = "mutated";

    expect(result).toEqual({
      ok: true,
      value: {
        jsonrpc: "2.0",
        id: 1,
        method: "subscriptions/listen",
        params: {
          notifications: { resourceSubscriptions: ["https://example.test/resource"] },
        },
      },
    });
  });

  it("rejects unknown filter fields before consuming an ID", () => {
    const builder = new McpSubscriptionsListenRequestBuilder();

    expect(builder.create({ toolsListChanged: true, observedMetadata: "untrusted" })).toMatchObject(
      {
        ok: false,
        error: { code: "NOVA-TL002" },
      },
    );
    expect(builder.create({ toolsListChanged: true })).toMatchObject({
      ok: true,
      value: { id: 1 },
    });
  });

  it("rejects empty filters, unsafe or duplicate URIs, invalid flags, and oversized values before consuming an ID", () => {
    const builder = new McpSubscriptionsListenRequestBuilder();

    expect(builder.create({})).toMatchObject({
      ok: false,
      error: { code: "NOVA-TL002" },
    });
    expect(builder.create({ toolsListChanged: "yes" })).toMatchObject({
      ok: false,
      error: { code: "NOVA-TL002" },
    });
    expect(builder.create({ resourceSubscriptions: ["file:///project/../secret"] })).toMatchObject({
      ok: false,
      error: { code: "NOVA-TL002" },
    });
    expect(
      builder.create({
        resourceSubscriptions: ["file:///project/a", "file:///project/a"],
      }),
    ).toMatchObject({ ok: false, error: { code: "NOVA-TL002" } });
    expect(
      builder.create({ resourceSubscriptions: ["file:///" + "x".repeat(2_049)] }),
    ).toMatchObject({ ok: false, error: { code: "NOVA-TL002" } });
    expect(builder.create({ toolsListChanged: true })).toMatchObject({
      ok: true,
      value: { id: 1 },
    });
  });
});
