/**
 * Eval runner — score a single recipe eval case against extraction results.
 *
 * recipe-commerce-mcp note: ExtractionResult does not carry _meta, so cost is
 * passed separately from the caller (sourced from RawExtractionResult.ai_cost_usd).
 * Fixture mode uses a synthetic result + 0.001 USD cost.
 */

import type {
  RecipeEvalCase,
  EvalResult,
  EvalReport,
  EvalMetrics,
  ImprovementPriority,
  ExtractionResult,
} from "./types.js";
import { STANDARD_SCORERS, scoreCost } from "./scorers/index.js";

export function scoreCase(
  evalCase: RecipeEvalCase,
  result: ExtractionResult,
  costUsd: number,
  durationMs: number,
): EvalResult {
  const scores = [
    ...STANDARD_SCORERS.map(fn => fn(evalCase, result)),
    scoreCost(evalCase, costUsd),
  ];

  const totalWeight = scores.reduce((sum, s) => sum + s.weight, 0);
  const overallScore =
    totalWeight > 0
      ? Math.round(scores.reduce((sum, s) => sum + s.score * s.weight, 0) / totalWeight)
      : 0;

  const passed = scores.every(s => s.passed);

  // F1 from accuracy scorer details string
  const accuracyScore = scores.find(s => s.dimension === "accuracy");
  const f1Match = accuracyScore?.details.match(/F1=(\d+)/);
  const precisionMatch = accuracyScore?.details.match(/P=(\d+)/);
  const recallMatch = accuracyScore?.details.match(/R=(\d+)/);
  const reqIngMatch = accuracyScore?.details.match(/Req\.ingredients:\s*(\d+)\/(\d+)/);

  const reqIngFound = reqIngMatch ? parseInt(reqIngMatch[1]!, 10) : 0;
  const reqIngTotal = reqIngMatch ? parseInt(reqIngMatch[2]!, 10) : 1;

  const metrics: EvalMetrics = {
    ingredient_count: result.ingredients.length,
    equipment_count: result.equipment.length,
    latency_ms: durationMs,
    cost_usd: costUsd,
    required_ingredient_recall: reqIngTotal > 0 ? reqIngFound / reqIngTotal : 1,
    required_equipment_recall: 1, // extracted from accuracy scorer if needed
    f1: f1Match ? parseInt(f1Match[1]!, 10) / 100 : 0,
  };

  // Refine equipment recall from accuracy scorer details
  const reqEqMatch = accuracyScore?.details.match(/Req\.equipment:\s*(\d+)\/(\d+)/);
  if (reqEqMatch) {
    const found = parseInt(reqEqMatch[1]!, 10);
    const total = parseInt(reqEqMatch[2]!, 10);
    metrics.required_equipment_recall = total > 0 ? found / total : 1;
  }

  void precisionMatch; // available in details string, not stored separately
  void recallMatch;

  return {
    caseId: evalCase.id,
    caseName: evalCase.name,
    timestamp: new Date().toISOString(),
    mode: "fixture",
    scores,
    overallScore,
    passed,
    durationMs,
    metrics,
  };
}

export function buildReport(results: EvalResult[], mode: "fixture" | "live"): EvalReport {
  const totalCases = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = totalCases - passed;

  const dimensionSums: Record<string, { total: number; count: number }> = {};
  for (const result of results) {
    for (const score of result.scores) {
      if (!dimensionSums[score.dimension]) {
        dimensionSums[score.dimension] = { total: 0, count: 0 };
      }
      dimensionSums[score.dimension]!.total += score.score;
      dimensionSums[score.dimension]!.count++;
    }
  }

  const dimensionAverages: Record<string, number> = {};
  for (const [dim, { total, count }] of Object.entries(dimensionSums)) {
    dimensionAverages[dim] = Math.round(total / count);
  }

  const overallScore =
    results.length > 0
      ? Math.round(results.reduce((sum, r) => sum + r.overallScore, 0) / results.length)
      : 0;

  const metricsResults = results.filter(r => r.metrics);
  const aggregatedMetrics = {
    avg_entity_count:
      metricsResults.length > 0
        ? Math.round(
            metricsResults.reduce((sum, r) => sum + r.metrics!.ingredient_count, 0) /
              metricsResults.length,
          )
        : 0,
    avg_latency_ms:
      metricsResults.length > 0
        ? Math.round(
            metricsResults.reduce((sum, r) => sum + r.metrics!.latency_ms, 0) /
              metricsResults.length,
          )
        : 0,
    avg_cost_usd:
      metricsResults.length > 0
        ? metricsResults.reduce((sum, r) => sum + r.metrics!.cost_usd, 0) /
          metricsResults.length
        : 0,
    avg_f1:
      metricsResults.length > 0
        ? Math.round(
            (metricsResults.reduce((sum, r) => sum + r.metrics!.f1, 0) /
              metricsResults.length) *
              100,
          ) / 100
        : 0,
    avg_ingredient_count:
      metricsResults.length > 0
        ? Math.round(
            metricsResults.reduce((sum, r) => sum + r.metrics!.ingredient_count, 0) /
              metricsResults.length,
          )
        : 0,
    avg_equipment_count:
      metricsResults.length > 0
        ? Math.round(
            metricsResults.reduce((sum, r) => sum + r.metrics!.equipment_count, 0) /
              metricsResults.length,
          )
        : 0,
  };

  const priorities: ImprovementPriority[] = [];
  for (const result of results) {
    for (const score of result.scores) {
      if (score.score < score.target) {
        const gap = score.target - score.score;
        const weightedGap = gap * score.weight;
        priorities.push({
          dimension: `${score.dimension} (${result.caseName})`,
          gap,
          weightedGap,
          suggestion: getSuggestion(score.dimension, gap),
        });
      }
    }
  }
  priorities.sort((a, b) => b.weightedGap - a.weightedGap);

  return {
    timestamp: new Date().toISOString(),
    mode,
    results,
    summary: { totalCases, passed, failed, overallScore, dimensionAverages },
    aggregatedMetrics,
    priorities: priorities.slice(0, 10),
  };
}

function getSuggestion(dimension: string, gap: number): string {
  const suggestions: Record<string, string> = {
    accuracy: "Improve extraction prompt — add examples of ingredient names and equipment",
    value: "Check that extraction returns difficulty, techniques, and ≥5 ingredients",
    cost: "Optimize prompt length — check transcript truncation settings",
  };
  return suggestions[dimension] ?? `Improve ${dimension} (gap: ${gap} points)`;
}
