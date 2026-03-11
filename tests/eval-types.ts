/**
 * Recipe Commerce MCP — Eval Framework Types
 *
 * Quality evaluation for ingredient extraction accuracy on real-world recipe content.
 * Three modes:
 *   fixture  — mocked extractor, tests scoring logic and schema correctness
 *   live     — real OpenAI calls, validates extraction quality on real content
 *   snapshot — update golden snapshots from live output
 */

import type { Ingredient, ProductMatch } from "../src/types.js";

// ============================================================================
// EVAL CASE
// ============================================================================

export interface ExpectedIngredient {
  /** Exact or partial ingredient name match (case-insensitive) */
  name: string;
  /** Expected category */
  category: string;
  /** Must be present in output — failure if missing */
  required: boolean;
}

export interface RecipeEvalCase {
  id: string;
  name: string;
  /** Data provenance — where the recipe content was sourced from */
  source: string;
  /** Full recipe transcript or description (real content from source) */
  content: string;
  /** Expected recipe name (partial match) */
  expectedRecipeName?: string;
  /** Ingredients we expect extraction to identify */
  expectedIngredients: ExpectedIngredient[];
  /** Max token budget for JSON output (default: 2000) */
  maxTokens?: number;
}

// ============================================================================
// EVAL RESULT
// ============================================================================

export interface ScorerResult {
  dimension: string;
  score: number;   // 0-100
  target: number;  // pass threshold
  details: string;
  passed: boolean;
}

export interface RecipeExtractionBundle {
  recipeName: string;
  ingredients: Ingredient[];
  products: ProductMatch[];
  ai_cost_usd: number;
}

export interface EvalResult {
  caseId: string;
  caseName: string;
  timestamp: string;
  scores: ScorerResult[];
  overallScore: number;
  passed: boolean;
  ingredientsExtracted: Ingredient[];
  productsMatched: ProductMatch[];
}
