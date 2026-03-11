/**
 * All recipe eval cases — exported as a flat array for the runner.
 */

export { beefBourguignon } from "./beef-bourguignon.js";
export { chocolateLayerCake } from "./chocolate-layer-cake.js";
export { pastaCarbonara } from "./pasta-carbonara.js";

import { beefBourguignon } from "./beef-bourguignon.js";
import { chocolateLayerCake } from "./chocolate-layer-cake.js";
import { pastaCarbonara } from "./pasta-carbonara.js";
import type { RecipeEvalCase } from "../types.js";

export const ALL_RECIPE_EVAL_CASES: RecipeEvalCase[] = [
  beefBourguignon,
  chocolateLayerCake,
  pastaCarbonara,
];
