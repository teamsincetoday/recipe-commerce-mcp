#!/usr/bin/env tsx
/**
 * Recipe Commerce MCP — Eval CLI
 *
 * Usage:
 *   cd /home/jonathan/recipe-commerce-mcp
 *   npx tsx src/__tests__/eval/eval-cli.ts              # fixture (synthetic, instant)
 *   EVAL_LIVE=true npx tsx src/__tests__/eval/eval-cli.ts   # live (real OpenAI calls)
 *
 * Live mode output is saved to:
 *   src/__tests__/eval/reports/YYYY-MM-DD-live.json
 *
 * Use the aggregatedMetrics in the report to fill in production/value-narratives.md.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { ALL_RECIPE_EVAL_CASES } from "./cases/index.js";
import { scoreCase, buildReport } from "./runner.js";
import type { EvalResult } from "./types.js";
import type { ExtractionResult } from "../../types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPORTS_DIR = resolve(__dirname, "reports");

const isLive = process.env["EVAL_LIVE"] === "true";
const mode = isLive ? "live" : "fixture";

async function main() {
  mkdirSync(REPORTS_DIR, { recursive: true });

  console.log(`\n🍳  Recipe Commerce MCP — Eval Suite (${mode} mode)\n`);
  console.log("─".repeat(60));

  const results: EvalResult[] = [];

  for (const evalCase of ALL_RECIPE_EVAL_CASES) {
    console.log(`\n▸ ${evalCase.name}`);

    let extractionResult: ExtractionResult;
    let costUsd: number;
    const startTime = Date.now();

    try {
      if (isLive) {
        const raw = await runLive(evalCase.transcript, evalCase.recipeId);
        extractionResult = raw.result;
        costUsd = raw.ai_cost_usd;
      } else {
        const fixture = buildFixture(evalCase.expectedIngredients.length);
        extractionResult = fixture.result;
        costUsd = fixture.ai_cost_usd;
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ ERROR: ${errMsg}`);
      results.push({
        caseId: evalCase.id,
        caseName: evalCase.name,
        timestamp: new Date().toISOString(),
        mode,
        scores: [],
        overallScore: 0,
        passed: false,
        durationMs: Date.now() - startTime,
        error: errMsg,
      });
      continue;
    }

    const durationMs = Date.now() - startTime;
    const evalResult = scoreCase(evalCase, extractionResult, costUsd, durationMs);
    evalResult.mode = mode;
    results.push(evalResult);

    const status = evalResult.passed ? "✓ PASS" : "✗ FAIL";
    console.log(`  ${status}  (score: ${evalResult.overallScore}/100, ${durationMs}ms)`);
    for (const s of evalResult.scores) {
      const ind = s.passed ? "✓" : "✗";
      console.log(`    ${ind} ${s.dimension}: ${s.score}/${s.target} — ${s.details}`);
    }
    if (evalResult.metrics) {
      const m = evalResult.metrics;
      console.log(
        `    📊 ingredients=${m.ingredient_count}, equipment=${m.equipment_count}, F1=${(m.f1 * 100).toFixed(0)}%, cost=$${m.cost_usd.toFixed(5)}`,
      );
    }
  }

  const report = buildReport(results, mode);

  // Print summary
  console.log("\n" + "═".repeat(60));
  console.log(`RECIPE EVAL SUMMARY  (${mode} mode)`);
  console.log("═".repeat(60));
  console.log(`Cases: ${report.summary.passed}/${report.summary.totalCases} passed`);
  console.log(`Overall score: ${report.summary.overallScore}/100`);
  console.log("\nDimension averages:");
  for (const [dim, avg] of Object.entries(report.summary.dimensionAverages)) {
    console.log(`  ${dim}: ${avg}/100`);
  }

  const m = report.aggregatedMetrics;
  console.log("\nAggregated metrics (for value-narratives.md fill-in):");
  console.log(`  avg_ingredient_count: ${m.avg_ingredient_count}`);
  console.log(`  avg_equipment_count:  ${m.avg_equipment_count}`);
  console.log(`  avg_latency_ms:       ${m.avg_latency_ms}`);
  console.log(`  avg_cost_usd:         $${m.avg_cost_usd.toFixed(5)}`);
  console.log(`  avg_f1:               ${(m.avg_f1 * 100).toFixed(0)}%`);

  // Revenue estimate (ingredient affiliate formula)
  const revenuePerRecipe = m.avg_ingredient_count * 0.04 * 12;
  console.log(`\n  💰 Revenue estimate: $${revenuePerRecipe.toFixed(2)}/recipe`);
  console.log(`     (${m.avg_ingredient_count} ingredients × 4% commission × $12 avg price)`);

  if (report.priorities.length > 0) {
    console.log("\nImprovement priorities:");
    for (const p of report.priorities.slice(0, 5)) {
      console.log(`  [${p.weightedGap.toFixed(1)}] ${p.dimension}: ${p.suggestion}`);
    }
  }

  // Write report
  const dateStr = new Date().toISOString().slice(0, 10);
  const reportPath = resolve(REPORTS_DIR, `${dateStr}-${mode}.json`);
  writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n");
  console.log(`\nReport: ${reportPath}`);

  process.exit(report.summary.failed > 0 ? 1 : 0);
}

async function runLive(
  transcript: string,
  recipeId?: string,
): Promise<{ result: ExtractionResult; ai_cost_usd: number }> {
  const { extractRecipeIngredients } = await import("../../extractor.js");

  const apiKey = process.env["OPENAI_API_KEY"];
  if (!apiKey) throw new Error("OPENAI_API_KEY required for live eval mode");

  process.env["OPENAI_API_KEY"] = apiKey;

  const raw = await extractRecipeIngredients({ transcript, recipeId });

  return { result: raw.result, ai_cost_usd: raw.ai_cost_usd };
}

function buildFixture(
  expectedIngredientCount: number,
): { result: ExtractionResult; ai_cost_usd: number } {
  const result: ExtractionResult = {
    recipeName: "Fixture Recipe",
    ingredients: Array.from({ length: Math.max(expectedIngredientCount, 5) }, (_, i) => ({
      name: `Ingredient ${i + 1}`,
      category: "pantry" as const,
      optional: false,
    })),
    equipment: [
      { name: "Large Pot", category: "cookware", requiredForRecipe: true },
      { name: "Skillet", category: "cookware", requiredForRecipe: false },
    ],
    techniques: ["sauté", "simmer"],
    difficulty: "medium" as const,
  };

  return { result, ai_cost_usd: 0.001 };
}

main().catch(err => {
  console.error("Eval failed:", err);
  process.exit(1);
});
