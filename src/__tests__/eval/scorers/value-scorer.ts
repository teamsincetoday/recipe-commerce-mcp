/**
 * Value scorer — is this recipe extraction actionable for product matching?
 *
 * Checks:
 *   - ingredient_count >= 5 (enough to build a shopping list)
 *   - equipment_count >= 1 (at least one equipment item detected)
 *   - technique_count >= 1 (techniques detected — signals recipe quality)
 *   - difficulty detected (optional: shows full parse)
 *
 * Target: 70/100
 */

import type { ScorerResult, RecipeEvalCase, ExtractionResult } from "../types.js";

export function scoreValue(
  _evalCase: RecipeEvalCase,
  result: ExtractionResult,
): ScorerResult {
  const ingredients = result.ingredients;
  const equipment = result.equipment;
  const techniques = result.techniques;

  let score = 0;
  const notes: string[] = [];

  // 1. Ingredient count (25 pts): >= 5 = 25pts, >= 3 = 15pts, >= 1 = 5pts, 0 = 0pts
  if (ingredients.length >= 5) {
    score += 25;
    notes.push(`ingredients=${ingredients.length} ✓`);
  } else if (ingredients.length >= 3) {
    score += 15;
    notes.push(`ingredients=${ingredients.length} (low)`);
  } else if (ingredients.length >= 1) {
    score += 5;
    notes.push(`ingredients=${ingredients.length} (very low)`);
  } else {
    notes.push("ingredients=0 ✗");
  }

  // 2. Equipment count (25 pts): >= 1 = 25pts, 0 = 0pts
  if (equipment.length >= 1) {
    score += 25;
    notes.push(`equipment=${equipment.length} ✓`);
  } else {
    notes.push("equipment=0 ✗");
  }

  // 3. Technique count (25 pts): >= 1 = 25pts, 0 = 0pts
  if (techniques.length >= 1) {
    score += 25;
    notes.push(`techniques=${techniques.length} ✓`);
  } else {
    notes.push("techniques=0 ✗");
  }

  // 4. Difficulty detected (25 pts): detected = 25pts, missing = 0pts
  if (result.difficulty) {
    score += 25;
    notes.push(`difficulty=${result.difficulty} ✓`);
  } else {
    notes.push("difficulty=missing ✗");
  }

  return {
    dimension: "value",
    score,
    target: 70,
    weight: 0.35,
    details: notes.join(", "),
    passed: score >= 70,
  };
}
