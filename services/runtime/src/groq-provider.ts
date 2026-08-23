import type { LlmProvider, ModelRequest, ModelResponse, HealthState } from "./model-router.js";

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1";

export interface GroqProviderOptions {
  readonly providerId: string;
  readonly model: string;
  readonly authReference: string;
  readonly resolveCredential: (reference: string) => Promise<string>;
  readonly endpoint?: string;
  readonly fetcher?: typeof fetch;
  readonly maxContextTokens?: number;
  readonly costPer1kTokens?: number;
  readonly latencyP50Ms?: number;
}

interface GroqCompletionResponse {
  readonly choices?: readonly {
    readonly message?: { readonly content?: unknown };
  }[];
}

export class GroqProvider implements LlmProvider {
  public readonly descriptor: LlmProvider["descriptor"];
  private readonly endpoint: string;
  private readonly fetcher: typeof fetch;
  private readonly options: GroqProviderOptions;

  public constructor(options: GroqProviderOptions) {
    this.options = options;
    this.endpoint = (options.endpoint ?? GROQ_ENDPOINT).replace(/\/$/, "");
    this.fetcher = options.fetcher ?? fetch;
    this.descriptor = {
      provider_id: options.providerId,
      domain: "llm",
      privacy_class: "cloud",
      schema_version: "1.0.0",
      cost_per_1k_tokens: options.costPer1kTokens ?? 0,
      capabilities: {
        tool_calls: false,
        vision_input: false,
        streaming: true,
        max_context_tokens: options.maxContextTokens ?? 131_072,
      },
    };
  }

  public async healthCheck(): Promise<HealthState> {
    try {
      const response = await this.fetch("/models", { method: "GET" });
      return response.ok ? "reachable" : "down";
    } catch {
      return "down";
    }
  }

  public async invoke(request: ModelRequest): Promise<ModelResponse> {
    if (!request.messages || request.messages.length === 0) {
      throw new Error("Groq requests require at least one chat message.");
    }
    const response = await this.fetch("/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: this.options.model,
        messages: request.messages,
        temperature: request.temperature ?? 0,
        stream: false,
      }),
    });
    if (!response.ok) {
      throw new Error(`Groq request failed with status ${response.status}.`);
    }
    const payload = (await response.json()) as GroqCompletionResponse;
    const text = payload.choices?.[0]?.message?.content;
    if (typeof text !== "string") {
      throw new Error("Groq response did not contain assistant text.");
    }
    return { text, provider_id: this.options.providerId };
  }

  private async fetch(path: string, init: RequestInit): Promise<Response> {
    const credential = await this.options.resolveCredential(this.options.authReference);
    const headers = new Headers(init.headers);
    headers.set("authorization", `Bearer ${credential}`);
    headers.set("accept", "application/json");
    return this.fetcher(`${this.endpoint}${path}`, { ...init, headers });
  }
}
