/**
 * Unit tests for cache.ts
 *
 * Tests SQLite in-memory cache, get/set, free tier metering.
 * Uses :memory: database — no filesystem writes.
 */

import { describe, it, expect } from "vitest";
import { RecipeCache, FREE_TIER_DAILY_LIMIT } from "../src/cache.js";
import type { ExtractionResult } from "../src/types.js";

// ============================================================================
// HELPERS
// ============================================================================

function makeExtractionResult(recipeName = "Test Recipe"): ExtractionResult {
  return {
    recipeName,
    ingredients: [
      { name: "flour", category: "pantry", optional: false, quantity: "2", unit: "cups" },
      { name: "butter", category: "dairy", optional: false },
    ],
    equipment: [
      { name: "mixing bowl", category: "tool", requiredForRecipe: true },
    ],
    techniques: ["mix", "bake"],
    cuisineType: "American",
    difficulty: "easy",
  };
}

// ============================================================================
// CACHE BASIC OPERATIONS
// ============================================================================

describe("RecipeCache — get/set", () => {
  it("returns null for a cache miss", () => {
    const cache = new RecipeCache(":memory:");
    expect(cache.get("nonexistent-recipe")).toBeNull();
    cache.close();
  });

  it("stores and retrieves an extraction result", () => {
    const cache = new RecipeCache(":memory:");
    const result = makeExtractionResult("Chocolate Cake");

    cache.set("recipe-001", result);
    const retrieved = cache.get("recipe-001");

    expect(retrieved).not.toBeNull();
    expect(retrieved?.recipeName).toBe("Chocolate Cake");
    expect(retrieved?.ingredients).toHaveLength(2);
    expect(retrieved?.equipment).toHaveLength(1);
    cache.close();
  });

  it("returns null for a different key after set", () => {
    const cache = new RecipeCache(":memory:");
    cache.set("recipe-a", makeExtractionResult("Recipe A"));

    expect(cache.get("recipe-b")).toBeNull();
    cache.close();
  });

  it("overwrites existing entry with INSERT OR REPLACE", () => {
    const cache = new RecipeCache(":memory:");
    const v1 = makeExtractionResult("Version 1");
    const v2 = makeExtractionResult("Version 2");

    cache.set("recipe-x", v1);
    cache.set("recipe-x", v2);

    const retrieved = cache.get("recipe-x");
    expect(retrieved?.recipeName).toBe("Version 2");
    cache.close();
  });

  it("handles ingredients with all optional fields", () => {
    const cache = new RecipeCache(":memory:");
    const result: ExtractionResult = {
      recipeName: "Minimal Recipe",
      ingredients: [
        { name: "salt", category: "pantry", optional: true },
      ],
      equipment: [],
      techniques: [],
    };

    cache.set("minimal-recipe", result);
    const retrieved = cache.get("minimal-recipe");

    expect(retrieved?.ingredients[0]?.quantity).toBeUndefined();
    expect(retrieved?.ingredients[0]?.unit).toBeUndefined();
    expect(retrieved?.cuisineType).toBeUndefined();
    expect(retrieved?.difficulty).toBeUndefined();
    cache.close();
  });
});

// ============================================================================
// FREE TIER METERING
// ============================================================================

describe("RecipeCache — free tier metering", () => {
  it("allows calls for a fresh agent", () => {
    const cache = new RecipeCache(":memory:");
    expect(cache.checkFreeTier("agent-fresh")).toBe(true);
    cache.close();
  });

  it("reports 0 calls used for a fresh agent", () => {
    const cache = new RecipeCache(":memory:");
    expect(cache.getFreeTierUsed("agent-new")).toBe(0);
    cache.close();
  });

  it("records usage and increments count", () => {
    const cache = new RecipeCache(":memory:");

    cache.recordUsage({
      agentId: "agent-test",
      toolName: "extract_recipe_ingredients",
      paymentMethod: "free_tier",
      amountUsd: 0,
      success: true,
    });

    expect(cache.getFreeTierUsed("agent-test")).toBe(1);
    cache.close();
  });

  it("blocks calls after limit exceeded", () => {
    const cache = new RecipeCache(":memory:");
    const agentId = "agent-exhausted";

    for (let i = 0; i < FREE_TIER_DAILY_LIMIT; i++) {
      cache.recordUsage({
        agentId,
        toolName: "extract_recipe_ingredients",
        paymentMethod: "free_tier",
        amountUsd: 0,
        success: true,
      });
    }

    expect(cache.checkFreeTier(agentId)).toBe(false);
    cache.close();
  });

  it("different agents have independent counts", () => {
    const cache = new RecipeCache(":memory:");

    cache.recordUsage({
      agentId: "agent-a",
      toolName: "extract_recipe_ingredients",
      paymentMethod: "free_tier",
      amountUsd: 0,
      success: true,
    });

    // agent-a used 1 call, agent-b still fresh
    expect(cache.getFreeTierUsed("agent-a")).toBe(1);
    expect(cache.getFreeTierUsed("agent-b")).toBe(0);
    expect(cache.checkFreeTier("agent-b")).toBe(true);
    cache.close();
  });

  it("FREE_TIER_DAILY_LIMIT is 3", () => {
    expect(FREE_TIER_DAILY_LIMIT).toBe(3);
  });

  it("allows exactly FREE_TIER_DAILY_LIMIT-1 calls", () => {
    const cache = new RecipeCache(":memory:");
    const agentId = "agent-partial";

    for (let i = 0; i < FREE_TIER_DAILY_LIMIT - 1; i++) {
      cache.recordUsage({
        agentId,
        toolName: "extract_recipe_ingredients",
        paymentMethod: "free_tier",
        amountUsd: 0,
        success: true,
      });
    }

    // Should still be allowed — under limit
    expect(cache.checkFreeTier(agentId)).toBe(true);
    cache.close();
  });

  it("records failed calls toward usage count", () => {
    const cache = new RecipeCache(":memory:");

    cache.recordUsage({
      agentId: "agent-fail",
      toolName: "extract_recipe_ingredients",
      paymentMethod: "free_tier",
      amountUsd: 0,
      success: false,
    });

    expect(cache.getFreeTierUsed("agent-fail")).toBe(1);
    cache.close();
  });
});

// ============================================================================
// MULTIPLE TOOL TYPES
// ============================================================================

describe("RecipeCache — multiple tools", () => {
  it("counts all tool calls for the same agent", () => {
    const cache = new RecipeCache(":memory:");
    const agentId = "agent-multi";

    cache.recordUsage({ agentId, toolName: "extract_recipe_ingredients", paymentMethod: "free_tier", amountUsd: 0, success: true });
    cache.recordUsage({ agentId, toolName: "match_ingredients_to_products", paymentMethod: "free_tier", amountUsd: 0, success: true });

    expect(cache.getFreeTierUsed(agentId)).toBe(2);
    cache.close();
  });

  it("can store multiple recipes independently", () => {
    const cache = new RecipeCache(":memory:");

    cache.set("pasta-001", makeExtractionResult("Pasta Carbonara"));
    cache.set("cake-001", makeExtractionResult("Chocolate Cake"));

    expect(cache.get("pasta-001")?.recipeName).toBe("Pasta Carbonara");
    expect(cache.get("cake-001")?.recipeName).toBe("Chocolate Cake");
    cache.close();
  });
});
