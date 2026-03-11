/**
 * Recipe Commerce MCP — Eval Scorers
 *
 * Four scoring dimensions:
 *   ingredient_recall — did extraction find the expected ingredients? (recall + required gate)
 *   value             — are product matches actionable? (affiliate data, commissions present)
 *   accuracy          — precision/recall/F1 against ground truth ingredients
 *   cost              — was token count within budget?
 */

import type { ScorerResult, RecipeEvalCase, RecipeExtractionBundle } from "./eval-types.js";

// ---------------------------------------------------------------------------
// Ingredient recall scorer
// ---------------------------------------------------------------------------

export function scoreIngredientRecall(
  evalCase: RecipeEvalCase,
  bundle: RecipeExtractionBundle
): ScorerResult {
  const expected = evalCase.expectedIngredients;
  const actual = bundle.ingredients ?? [];

  if (expected.length === 0) {
    return {
      dimension: "ingredient_recall",
      score: 100,
      target: 80,
      details: "No ingredients expected — skipped",
      passed: true,
    };
  }

  const required = expected.filter((e) => e.required);
  let foundRequired = 0;
  let foundTotal = 0;

  for (const exp of expected) {
    const hit = actual.some((a) =>
      a.name.toLowerCase().includes(exp.name.toLowerCase()) ||
      exp.name.toLowerCase().includes(a.name.toLowerCase())
    );
    if (hit) {
      foundTotal++;
      if (exp.required) foundRequired++;
    }
  }

  const requiredRecall = required.length > 0 ? (foundRequired / required.length) * 100 : 100;
  const overallRecall = (foundTotal / expected.length) * 100;
  const score = Math.round(requiredRecall * 0.7 + overallRecall * 0.3);

  return {
    dimension: "ingredient_recall",
    score,
    target: 80,
    details: `${foundTotal}/${expected.length} found (${foundRequired}/${required.length} required). Actual total: ${actual.length}`,
    passed: score >= 80,
  };
}

// ---------------------------------------------------------------------------
// Value scorer — are product matches actionable?
// ---------------------------------------------------------------------------

export function scoreValue(
  evalCase: RecipeEvalCase,
  bundle: RecipeExtractionBundle
): ScorerResult {
  const products = bundle.products ?? [];
  let score = 0;
  const reasons: string[] = [];

  // Has product matches (40pts)
  if (products.length > 0) {
    score += 40;
    reasons.push(`${products.length} products matched`);
  }

  // Has commission rates (30pts)
  const hasCommission = products.some((p) => p.commissionRate > 0);
  if (hasCommission) {
    score += 30;
    const avgCommission = products.reduce((s, p) => s + p.commissionRate, 0) / products.length;
    reasons.push(`avg commission: ${(avgCommission * 100).toFixed(1)}%`);
  }

  // Has affiliate program assignments (30pts)
  const hasAffiliateProgram = products.some((p) => p.affiliateProgram && p.affiliateProgram !== "other");
  if (hasAffiliateProgram) { score += 30; reasons.push("affiliate programs assigned"); }

  return {
    dimension: "value",
    score,
    target: 70,
    details: reasons.join(", ") || "No product matches found",
    passed: score >= 70,
  };
}

// ---------------------------------------------------------------------------
// Accuracy scorer — F1 against ground truth ingredients
// ---------------------------------------------------------------------------

export function scoreAccuracy(
  evalCase: RecipeEvalCase,
  bundle: RecipeExtractionBundle
): ScorerResult {
  const expected = evalCase.expectedIngredients;
  const actual = bundle.ingredients ?? [];

  if (expected.length === 0 && actual.length === 0) {
    return { dimension: "accuracy", score: 100, target: 80, details: "Empty case (correct)", passed: true };
  }

  let truePositives = 0;
  for (const exp of expected) {
    if (actual.some((a) =>
      a.name.toLowerCase().includes(exp.name.toLowerCase()) ||
      exp.name.toLowerCase().includes(a.name.toLowerCase())
    )) {
      truePositives++;
    }
  }

  const precision = actual.length > 0 ? truePositives / actual.length : 0;
  const recall = expected.length > 0 ? truePositives / expected.length : 0;
  const f1 = precision + recall > 0 ? 2 * precision * recall / (precision + recall) : 0;
  const score = Math.round(f1 * 100);

  return {
    dimension: "accuracy",
    score,
    target: 80,
    details: `F1: ${score}/100 — precision: ${Math.round(precision * 100)}%, recall: ${Math.round(recall * 100)}%`,
    passed: score >= 80,
  };
}

// ---------------------------------------------------------------------------
// Cost scorer — within token budget?
// ---------------------------------------------------------------------------

export function scoreCost(
  evalCase: RecipeEvalCase,
  bundle: RecipeExtractionBundle
): ScorerResult {
  const maxTokens = evalCase.maxTokens ?? 2000;
  // Estimate tokens from JSON output size (rough: 4 chars ≈ 1 token)
  const outputStr = JSON.stringify({ ingredients: bundle.ingredients, products: bundle.products });
  const estimatedTokens = Math.ceil(outputStr.length / 4);
  const pct = Math.round((estimatedTokens / maxTokens) * 100);
  const score = Math.max(0, 100 - Math.max(0, pct - 100));

  return {
    dimension: "cost",
    score,
    target: 80,
    details: `~${estimatedTokens} tokens (budget: ${maxTokens}). ${pct <= 100 ? "Within budget" : `${pct - 100}% over budget`}`,
    passed: score >= 80,
  };
}

export const ALL_SCORERS = [scoreIngredientRecall, scoreValue, scoreAccuracy, scoreCost];
