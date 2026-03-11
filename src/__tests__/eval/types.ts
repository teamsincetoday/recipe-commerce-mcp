/**
 * Recipe Commerce MCP — Eval Framework Types
 *
 * Evaluates extractRecipeIngredients() output against ground truth.
 * Focuses on ingredient + equipment extraction quality.
 */

import type { ExtractionResult } from "../../types.js";

export interface RecipeEvalCase {
  id: string;
  name: string;
  description: string;
  /** Raw transcript text (not a URL — deterministic, network-free) */
  transcript: string;
  recipeId?: string;
  /** Expected ingredients — ground truth for recall/precision scoring */
  expectedIngredients: ExpectedIngredient[];
  /** Expected equipment */
  expectedEquipment: ExpectedEquipmentItem[];
  /** Maximum cost in USD */
  maxCostUsd?: number;
}

export interface ExpectedIngredient {
  name: string;
  required: boolean;
  category?: string;
}

export interface ExpectedEquipmentItem {
  name: string;
  required: boolean;
}

export interface ScorerResult {
  dimension: string;
  score: number;       // 0-100
  target: number;      // target score 0-100
  weight: number;      // business weight 0-1
  details: string;
  passed: boolean;
}

export interface EvalResult {
  caseId: string;
  caseName: string;
  timestamp: string;
  mode: "fixture" | "live";
  scores: ScorerResult[];
  overallScore: number;
  passed: boolean;
  durationMs: number;
  /** Captured metrics for value narrative fill-in */
  metrics?: EvalMetrics;
  error?: string;
}

export interface EvalMetrics {
  ingredient_count: number;
  equipment_count: number;
  latency_ms: number;
  cost_usd: number;
  /** Recall of required ingredients (0-1) */
  required_ingredient_recall: number;
  /** Recall of required equipment (0-1) */
  required_equipment_recall: number;
  /** Combined F1 across ingredients */
  f1: number;
}

export interface EvalReport {
  timestamp: string;
  mode: "fixture" | "live";
  results: EvalResult[];
  summary: {
    totalCases: number;
    passed: number;
    failed: number;
    overallScore: number;
    dimensionAverages: Record<string, number>;
  };
  /** Aggregated metrics across all cases (for value narrative fill-in) */
  aggregatedMetrics: {
    avg_entity_count: number;
    avg_latency_ms: number;
    avg_cost_usd: number;
    avg_f1: number;
    avg_ingredient_count: number;
    avg_equipment_count: number;
  };
  priorities: ImprovementPriority[];
}

export interface ImprovementPriority {
  dimension: string;
  gap: number;
  weightedGap: number;
  suggestion: string;
}

export type { ExtractionResult };
