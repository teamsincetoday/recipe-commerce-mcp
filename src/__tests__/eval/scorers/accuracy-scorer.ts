/**
 * Accuracy scorer — ingredient + equipment recall vs ground truth.
 *
 * Ingredient recall: foundRequired / totalRequired × 100 (weight: 0.35)
 * Equipment recall:  foundRequiredEquipment / totalRequired × 100 (weight: 0.25)
 * Combined F1:       harmonic mean of ingredient precision and recall
 * Score:             60% combined_recall + 40% precision, target 80.
 */

import type { ScorerResult, RecipeEvalCase, ExtractionResult } from "../types.js";

export function scoreAccuracy(
  evalCase: RecipeEvalCase,
  result: ExtractionResult,
): ScorerResult {
  const expectedIngredients = evalCase.expectedIngredients;
  const actualIngredients = result.ingredients;
  const expectedEquipment = evalCase.expectedEquipment;
  const actualEquipment = result.equipment;

  // ── Ingredient precision / recall / F1 ──────────────────────────────────
  let ingredientTPs = 0;
  const matchedIngredients = new Set<number>();

  for (const act of actualIngredients) {
    for (let i = 0; i < expectedIngredients.length; i++) {
      if (matchedIngredients.has(i)) continue;
      const exp = expectedIngredients[i]!;
      const match =
        act.name.toLowerCase().includes(exp.name.toLowerCase()) ||
        exp.name.toLowerCase().includes(act.name.toLowerCase());
      if (match) {
        ingredientTPs++;
        matchedIngredients.add(i);
        break;
      }
    }
  }

  const ingredientPrecision =
    actualIngredients.length > 0 ? ingredientTPs / actualIngredients.length : 0;
  const ingredientRecall =
    expectedIngredients.length > 0 ? ingredientTPs / expectedIngredients.length : 0;
  const f1 =
    ingredientPrecision + ingredientRecall > 0
      ? (2 * ingredientPrecision * ingredientRecall) /
        (ingredientPrecision + ingredientRecall)
      : 0;

  // ── Required ingredient recall ────────────────────────────────────────────
  const requiredIngredients = expectedIngredients.filter(e => e.required);
  let requiredIngredientsFound = 0;
  for (const req of requiredIngredients) {
    const found = actualIngredients.some(
      a =>
        a.name.toLowerCase().includes(req.name.toLowerCase()) ||
        req.name.toLowerCase().includes(a.name.toLowerCase()),
    );
    if (found) requiredIngredientsFound++;
  }
  const requiredIngredientRecall =
    requiredIngredients.length > 0
      ? requiredIngredientsFound / requiredIngredients.length
      : 1;

  // ── Required equipment recall ─────────────────────────────────────────────
  const requiredEquipment = expectedEquipment.filter(e => e.required);
  let requiredEquipmentFound = 0;
  for (const req of requiredEquipment) {
    const found = actualEquipment.some(
      a =>
        a.name.toLowerCase().includes(req.name.toLowerCase()) ||
        req.name.toLowerCase().includes(a.name.toLowerCase()),
    );
    if (found) requiredEquipmentFound++;
  }
  const requiredEquipmentRecall =
    requiredEquipment.length > 0
      ? requiredEquipmentFound / requiredEquipment.length
      : 1;

  // ── Combined score: 60% recall blend + 40% precision ─────────────────────
  // Recall blend: ingredient recall weighted 0.35, equipment recall weighted 0.25
  const recallBlend =
    requiredIngredientRecall * 0.35 + requiredEquipmentRecall * 0.25;
  // Normalize so max recall blend = 1 when both recalls are 1
  const recallBlendNorm = recallBlend / (0.35 + 0.25);

  const rawScore = (recallBlendNorm * 0.6 + ingredientPrecision * 0.4) * 100;
  const score = Math.round(rawScore);

  return {
    dimension: "accuracy",
    score,
    target: 80,
    weight: 0.40,
    details: [
      `F1=${(f1 * 100).toFixed(0)}`,
      `(P=${(ingredientPrecision * 100).toFixed(0)}, R=${(ingredientRecall * 100).toFixed(0)})`,
      `Req.ingredients: ${requiredIngredientsFound}/${requiredIngredients.length}`,
      `Req.equipment: ${requiredEquipmentFound}/${requiredEquipment.length}`,
      `Found: ${actualIngredients.length} ingredients, ${actualEquipment.length} equipment`,
    ].join(". "),
    passed: score >= 80,
  };
}
