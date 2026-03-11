/**
 * Cost scorer — is the extraction cost within budget?
 *
 * Target: cost <= maxCostUsd (default 0.01)
 * Score: 100 if under budget, decays linearly to 0 at 3× budget.
 *
 * Note: recipe ExtractionResult does not carry _meta, so costUsd is passed
 * separately from the runner (sourced from RawExtractionResult.ai_cost_usd).
 */

import type { ScorerResult, RecipeEvalCase } from "../types.js";

export function scoreCost(
  evalCase: RecipeEvalCase,
  costUsd: number,
): ScorerResult {
  const budget = evalCase.maxCostUsd ?? 0.01;

  let score: number;
  if (costUsd <= budget) {
    score = 100;
  } else {
    // Linear decay from 100 (at budget) to 0 (at 3× budget)
    const overRatio = (costUsd - budget) / (budget * 2);
    score = Math.max(0, Math.round(100 * (1 - overRatio)));
  }

  return {
    dimension: "cost",
    score,
    target: 80,
    weight: 0.25,
    details: `cost=$${costUsd.toFixed(5)} (budget=$${budget.toFixed(4)})${costUsd <= budget ? " ✓" : " ✗"}`,
    passed: costUsd <= budget,
  };
}
