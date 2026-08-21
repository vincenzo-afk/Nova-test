import { err, ok, type Result } from "@nova/shared";
import type { RankedRetrievalResult } from "./retrieval-fusion.js";

export interface ContextBuildInput {
  readonly original_request: string;
  readonly response_format_instructions: string;
  readonly purpose: string;
  readonly token_budget: number;
  readonly candidates: readonly RankedRetrievalResult[];
}

export interface ContextItem {
  readonly id: string;
  readonly content: string;
  readonly score: number;
}

export interface ContextPack {
  readonly original_request: string;
  readonly response_format_instructions: string;
  readonly items: readonly ContextItem[];
  readonly token_estimate: number;
}

export class ContextBuilder {
  build(input: ContextBuildInput): Result<ContextPack> {
    const protectedTokens =
      estimateTokens(input.original_request) + estimateTokens(input.response_format_instructions);
    if (protectedTokens > input.token_budget) {
      return err({
        code: "NOVA-AI002",
        message:
          "Protected request and response-format instructions exceed the model token budget.",
        retryable: false,
      });
    }

    const eligible = input.candidates
      .filter((candidate) => !candidate.inactive)
      .filter(
        (candidate) =>
          candidate.sensitive_category === undefined ||
          candidate.sensitive_category === input.purpose,
      )
      .sort((left, right) => right.score - left.score);
    const items: ContextItem[] = [];
    let tokens = protectedTokens;
    for (const candidate of eligible) {
      const candidateTokens = estimateTokens(candidate.content);
      if (tokens + candidateTokens <= input.token_budget) {
        items.push({ id: candidate.id, content: candidate.content, score: candidate.score });
        tokens += candidateTokens;
      }
    }

    return ok({
      original_request: input.original_request,
      response_format_instructions: input.response_format_instructions,
      items,
      token_estimate: tokens,
    });
  }
}

const estimateTokens = (text: string): number => Math.ceil(text.length / 4);
