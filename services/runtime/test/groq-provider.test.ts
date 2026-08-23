import { describe, expect, it, vi } from "vitest";
import { GroqProvider } from "../src/groq-provider.js";

describe("GroqProvider", () => {
  it("describes the configured cloud provider and resolves credentials only at call time", async () => {
    const fetcher = vi.fn<typeof fetch>(
      async () =>
        new Response(JSON.stringify({ data: [{ id: "llama-3.3-70b-versatile" }] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    );
    const resolveCredential = vi.fn(async (reference: string) => {
      expect(reference).toBe("vault://nova/groq-primary");
      return "secret-from-vault";
    });
    const provider = new GroqProvider({
      providerId: "groq.primary",
      model: "llama-3.3-70b-versatile",
      authReference: "vault://nova/groq-primary",
      resolveCredential,
      fetcher,
    });

    expect(provider.descriptor).toMatchObject({
      provider_id: "groq.primary",
      domain: "llm",
      privacy_class: "cloud",
      capabilities: { streaming: true, vision_input: false, tool_calls: false },
    });
    await expect(provider.healthCheck()).resolves.toBe("reachable");
    expect(resolveCredential).toHaveBeenCalledOnce();
    expect(fetcher).toHaveBeenCalledWith(
      "https://api.groq.com/openai/v1/models",
      expect.objectContaining({ method: "GET" }),
    );
    const requestInit = fetcher.mock.calls[0]?.[1];
    expect(new Headers(requestInit?.headers).get("authorization")).toBe("Bearer secret-from-vault");
  });

  it("translates a typed chat request and returns the assistant text", async () => {
    const fetcher = vi.fn<typeof fetch>(async (_input, init) => {
      expect(init?.method).toBe("POST");
      expect(JSON.parse(String(init?.body))).toMatchObject({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: "Explain Nova." }],
        temperature: 0,
        stream: false,
      });
      return new Response(
        JSON.stringify({
          choices: [{ message: { role: "assistant", content: "Nova is local-first." } }],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    });
    const provider = new GroqProvider({
      providerId: "groq.primary",
      model: "llama-3.3-70b-versatile",
      authReference: "vault://nova/groq-primary",
      resolveCredential: async () => "secret-from-vault",
      fetcher,
    });

    await expect(
      provider.invoke({
        messages: [{ role: "user", content: "Explain Nova." }],
        temperature: 0,
      }),
    ).resolves.toEqual({ text: "Nova is local-first.", provider_id: "groq.primary" });
  });

  it("reports authentication and provider failures as typed errors", async () => {
    const fetcher = vi.fn<typeof fetch>(
      async () =>
        new Response(JSON.stringify({ error: { message: "invalid api key" } }), { status: 401 }),
    );
    const provider = new GroqProvider({
      providerId: "groq.primary",
      model: "llama-3.3-70b-versatile",
      authReference: "vault://nova/groq-primary",
      resolveCredential: async () => "secret-from-vault",
      fetcher,
    });

    await expect(provider.healthCheck()).resolves.toBe("down");
    await expect(
      provider.invoke({ messages: [{ role: "user", content: "Hello" }] }),
    ).rejects.toThrow("Groq request failed with status 401");
  });
});
