/**
 * Recipe Commerce MCP — Eval Runner
 *
 * Usage:
 *   npx tsx tests/eval-runner.ts               # fixture mode (mocked extractor)
 *   EVAL_LIVE=true npx tsx tests/eval-runner.ts # live mode (real OpenAI API)
 *
 * Fixture mode: injects a deterministic mock that returns all expectedIngredients.
 * Live mode: calls extractRecipeIngredients() + computeProductMatches() with real API.
 */

import type { RecipeEvalCase, EvalResult, RecipeExtractionBundle } from "./eval-types.js";
import { ALL_SCORERS } from "./eval-scorers.js";
import { ALL_CASES } from "./eval-cases/index.js";
import type { Ingredient } from "../src/types.js";

// ---------------------------------------------------------------------------
// Fixture mock — returns expectedIngredients as Ingredients + mock product matches
// ---------------------------------------------------------------------------

function mockExtraction(evalCase: RecipeEvalCase): RecipeExtractionBundle {
  const ingredients: Ingredient[] = evalCase.expectedIngredients.map((ei) => ({
    name: ei.name,
    category: ei.category as Ingredient["category"],
    optional: false,
  }));

  // Mock product matches — one per ingredient with realistic affiliate data
  const products = ingredients.map((ing) => ({
    ingredient: ing.name,
    productName: `${ing.name} (Mock Product)`,
    brand: "MockBrand",
    category: ing.category,
    affiliateProgram: "amazon_associates" as const,
    estimatedPrice: { min: 5, max: 20, currency: "USD" as const },
    commissionRate: 0.04,
    affiliateScore: 70,
    substitutes: [],
  }));

  return { recipeName: evalCase.name, ingredients, products, ai_cost_usd: 0 };
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

async function runCase(
  evalCase: RecipeEvalCase,
  mode: "fixture" | "live"
): Promise<EvalResult> {
  const start = Date.now();
  let bundle: RecipeExtractionBundle;

  if (mode === "live") {
    const { extractRecipeIngredients, computeProductMatches, setOpenAIClient } =
      await import("../src/extractor.js");
    const OpenAI = (await import("openai")).default;
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY not set for live eval");
    setOpenAIClient(new OpenAI({ apiKey }));
    const extracted = await extractRecipeIngredients({ transcript: evalCase.content });
    const products = computeProductMatches(extracted.result.ingredients);
    bundle = {
      recipeName: extracted.result.recipeName,
      ingredients: extracted.result.ingredients,
      products,
      ai_cost_usd: extracted.ai_cost_usd,
    };
  } else {
    bundle = mockExtraction(evalCase);
  }

  const elapsedMs = Date.now() - start;
  void elapsedMs; // available for future timing scorer

  const scores = ALL_SCORERS.map((scorer) => scorer(evalCase, bundle));
  const overallScore = Math.round(scores.reduce((s, r) => s + r.score, 0) / scores.length);

  return {
    caseId: evalCase.id,
    caseName: evalCase.name,
    timestamp: new Date().toISOString(),
    scores,
    overallScore,
    passed: scores.every((s) => s.passed),
    ingredientsExtracted: bundle.ingredients,
    productsMatched: bundle.products,
  };
}

async function main() {
  const mode = process.env.EVAL_LIVE === "true" ? "live" : "fixture";
  console.log(`\n🧪 Recipe Commerce MCP — Eval (mode: ${mode})\n`);

  const results: EvalResult[] = [];
  for (const evalCase of ALL_CASES) {
    process.stdout.write(`  ${evalCase.name}... `);
    try {
      const result = await runCase(evalCase, mode);
      results.push(result);
      const status = result.passed ? "✅ PASS" : "❌ FAIL";
      console.log(`${status} (${result.overallScore}/100)`);
      for (const score of result.scores) {
        const icon = score.passed ? "  ✓" : "  ✗";
        console.log(`${icon} ${score.dimension}: ${score.score}/${score.target} — ${score.details}`);
      }
    } catch (err) {
      console.log(`💥 ERROR: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const passed = results.filter((r) => r.passed).length;
  const total = results.length;
  console.log(`\nResults: ${passed}/${total} cases passed\n`);

  if (passed < total) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
