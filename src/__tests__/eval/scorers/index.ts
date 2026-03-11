/**
 * All scorers for recipe-commerce-mcp eval framework.
 *
 * Note: scoreCost has a different signature (no ExtractionResult arg — cost is
 * passed separately from RawExtractionResult.ai_cost_usd). Use STANDARD_SCORERS
 * for the accuracy + value pair, then call scoreCost directly in the runner.
 */

export { scoreAccuracy } from "./accuracy-scorer.js";
export { scoreValue } from "./value-scorer.js";
export { scoreCost } from "./cost-scorer.js";

import type { ScorerResult, RecipeEvalCase, ExtractionResult } from "../types.js";
import { scoreAccuracy } from "./accuracy-scorer.js";
import { scoreValue } from "./value-scorer.js";

/** Scorers that operate on ExtractionResult directly (no separate cost param). */
export type StandardScorerFn = (
  evalCase: RecipeEvalCase,
  result: ExtractionResult,
) => ScorerResult;

export const STANDARD_SCORERS: StandardScorerFn[] = [
  scoreAccuracy,
  scoreValue,
];
