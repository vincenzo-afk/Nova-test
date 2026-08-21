import type { RetrievalCandidate } from "./knowledge-graph.js";

export type RetrievalBranch = "semantic" | "keyword" | "graph" | "temporal" | "entity";

export interface RetrievalBranchResult {
  readonly branch: RetrievalBranch;
  readonly candidates: readonly RetrievalCandidate[];
}

export interface RankedRetrievalResult extends RetrievalCandidate {
  readonly score: number;
}

const weights: Readonly<Record<RetrievalBranch, number>> = {
  semantic: 0.3,
  keyword: 0.25,
  graph: 0.2,
  temporal: 0.1,
  entity: 0.15,
};

export class RetrievalFusion {
  fuse(branches: readonly RetrievalBranchResult[]): RankedRetrievalResult[] {
    const merged = new Map<string, RankedRetrievalResult>();
    for (const branch of branches) {
      const branchWeight = weights[branch.branch];
      for (const candidate of branch.candidates) {
        if (candidate.inactive) {
          continue;
        }
        const contribution = this.contribution(candidate, branch.branch, branchWeight);
        const previous = merged.get(candidate.id);
        if (previous) {
          merged.set(candidate.id, {
            ...previous,
            score: Math.min(1, previous.score + contribution),
          });
        } else {
          merged.set(candidate.id, { ...candidate, score: Math.min(1, contribution) });
        }
      }
    }
    return [...merged.values()].sort((left, right) => right.score - left.score);
  }

  private contribution(
    candidate: RetrievalCandidate,
    branch: RetrievalBranch,
    branchWeight: number,
  ): number {
    const branchScore = candidate[`${branch}_score` as keyof RetrievalCandidate];
    const numericBranchScore = typeof branchScore === "number" ? branchScore : 0;
    const secondary =
      candidate.importance * 0.2 +
      candidate.confidence * 0.15 +
      candidate.recency * 0.1 +
      candidate.project_relevance * 0.1 +
      Math.min(1, candidate.usage_frequency) * 0.05 +
      (candidate.pinned ? 0.4 : 0);
    return Math.min(1, numericBranchScore * branchWeight + secondary);
  }
}
