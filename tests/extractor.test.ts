/**
 * Unit tests for extractor.ts
 *
 * Tests normalizeIngredients(), normalizeEquipment(), computeProductMatches(),
 * buildShoppingList(), equipmentToIngredients(), and extractRecipeIngredients() (mocked OpenAI).
 * No real API calls.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  normalizeIngredients,
  normalizeEquipment,
  computeProductMatches,
  buildShoppingList,
  equipmentToIngredients,
  extractIngredientBrand,
} from "../src/extractor.js";
import type { Ingredient, Equipment, OpenAIIngredientResponse } from "../src/types.js";

// ============================================================================
// normalizeIngredients
// ============================================================================

describe("normalizeIngredients", () => {
  it("returns empty array for empty input", () => {
    expect(normalizeIngredients([])).toEqual([]);
  });

  it("normalizes a valid ingredient entry", () => {
    const raw: OpenAIIngredientResponse["ingredients"] = [
      {
        name: "all-purpose flour",
        quantity: "2",
        unit: "cups",
        category: "pantry",
        optional: false,
      },
    ];

    const result = normalizeIngredients(raw);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      name: "all-purpose flour",
      quantity: "2",
      unit: "cups",
      category: "pantry",
      optional: false,
    });
  });

  it("falls back to 'other' for unknown categories", () => {
    const raw: OpenAIIngredientResponse["ingredients"] = [
      {
        name: "mystery spice",
        category: "interstellar",
        optional: false,
      },
    ];

    const result = normalizeIngredients(raw);
    expect(result[0]?.category).toBe("other");
  });

  it("deduplicates by name (case-insensitive)", () => {
    const raw: OpenAIIngredientResponse["ingredients"] = [
      { name: "Olive Oil", category: "pantry", optional: false },
      { name: "olive oil", category: "pantry", optional: false },
    ];

    const result = normalizeIngredients(raw);
    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe("Olive Oil");
  });

  it("skips entries with empty name", () => {
    const raw: OpenAIIngredientResponse["ingredients"] = [
      { name: "", category: "pantry", optional: false },
      { name: "   ", category: "fresh", optional: false },
    ];

    expect(normalizeIngredients(raw)).toHaveLength(0);
  });

  it("preserves optional flag", () => {
    const raw: OpenAIIngredientResponse["ingredients"] = [
      { name: "fresh parsley", category: "fresh", optional: true },
    ];

    const result = normalizeIngredients(raw);
    expect(result[0]?.optional).toBe(true);
  });

  it("omits quantity and unit if not provided", () => {
    const raw: OpenAIIngredientResponse["ingredients"] = [
      { name: "salt", category: "pantry", optional: false },
    ];

    const result = normalizeIngredients(raw);
    expect(result[0]?.quantity).toBeUndefined();
    expect(result[0]?.unit).toBeUndefined();
  });

  it("handles all valid ingredient categories", () => {
    const categories = ["pantry", "fresh", "dairy", "meat", "seafood", "equipment", "specialty", "other"] as const;

    for (const cat of categories) {
      const raw: OpenAIIngredientResponse["ingredients"] = [
        { name: `item-${cat}`, category: cat, optional: false },
      ];
      const result = normalizeIngredients(raw);
      expect(result[0]?.category).toBe(cat);
    }
  });
});

// ============================================================================
// normalizeEquipment
// ============================================================================

describe("normalizeEquipment", () => {
  it("returns empty array for empty input", () => {
    expect(normalizeEquipment([])).toEqual([]);
  });

  it("normalizes a valid equipment entry", () => {
    const raw: OpenAIIngredientResponse["equipment"] = [
      {
        name: "cast iron skillet",
        category: "cookware",
        required_for_recipe: true,
      },
    ];

    const result = normalizeEquipment(raw);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      name: "cast iron skillet",
      category: "cookware",
      requiredForRecipe: true,
    });
  });

  it("deduplicates equipment by name (case-insensitive)", () => {
    const raw: OpenAIIngredientResponse["equipment"] = [
      { name: "Stand Mixer", category: "appliance", required_for_recipe: true },
      { name: "stand mixer", category: "appliance", required_for_recipe: false },
    ];

    const result = normalizeEquipment(raw);
    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe("Stand Mixer");
  });

  it("skips entries with empty name", () => {
    const raw: OpenAIIngredientResponse["equipment"] = [
      { name: "", category: "cookware", required_for_recipe: false },
    ];

    expect(normalizeEquipment(raw)).toHaveLength(0);
  });

  it("defaults to 'other' for empty category", () => {
    const raw: OpenAIIngredientResponse["equipment"] = [
      { name: "tongs", category: "", required_for_recipe: false },
    ];

    const result = normalizeEquipment(raw);
    expect(result[0]?.category).toBe("other");
  });

  it("preserves required flag", () => {
    const raw: OpenAIIngredientResponse["equipment"] = [
      { name: "Dutch oven", category: "cookware", required_for_recipe: true },
      { name: "food processor", category: "appliance", required_for_recipe: false },
    ];

    const result = normalizeEquipment(raw);
    const dutch = result.find((e) => e.name === "Dutch oven");
    const processor = result.find((e) => e.name === "food processor");
    expect(dutch?.requiredForRecipe).toBe(true);
    expect(processor?.requiredForRecipe).toBe(false);
  });
});

// ============================================================================
// computeProductMatches
// ============================================================================

describe("computeProductMatches", () => {
  it("returns empty array for empty ingredient list", () => {
    expect(computeProductMatches([])).toEqual([]);
  });

  it("maps each ingredient to a product match", () => {
    const ingredients: Ingredient[] = [
      { name: "butter", category: "dairy", optional: false },
      { name: "flour", category: "pantry", optional: false },
    ];

    const matches = computeProductMatches(ingredients);
    expect(matches).toHaveLength(2);
  });

  it("equipment category gets highest affiliate score", () => {
    const ingredients: Ingredient[] = [
      { name: "cast iron skillet", category: "equipment", optional: false },
      { name: "fresh basil", category: "fresh", optional: false },
    ];

    const matches = computeProductMatches(ingredients);
    const equip = matches.find((m) => m.ingredient === "cast iron skillet");
    const fresh = matches.find((m) => m.ingredient === "fresh basil");

    expect(equip?.affiliateScore).toBeGreaterThan(fresh?.affiliateScore ?? 1);
  });

  it("equipment uses williams_sonoma affiliate program", () => {
    const ingredients: Ingredient[] = [
      { name: "stand mixer", category: "equipment", optional: false },
    ];

    const matches = computeProductMatches(ingredients);
    expect(matches[0]?.affiliateProgram).toBe("williams_sonoma");
  });

  it("fresh produce uses instacart affiliate program", () => {
    const ingredients: Ingredient[] = [
      { name: "cherry tomatoes", category: "fresh", optional: false },
    ];

    const matches = computeProductMatches(ingredients);
    expect(matches[0]?.affiliateProgram).toBe("instacart");
  });

  it("pantry items use amazon_associates affiliate program", () => {
    const ingredients: Ingredient[] = [
      { name: "olive oil", category: "pantry", optional: false },
    ];

    const matches = computeProductMatches(ingredients);
    expect(matches[0]?.affiliateProgram).toBe("amazon_associates");
  });

  it("affiliate score is clamped to 0-1", () => {
    const ingredients: Ingredient[] = [
      { name: "cast iron skillet", category: "equipment", optional: false },
      { name: "tomato", category: "fresh", optional: false },
    ];

    const matches = computeProductMatches(ingredients);
    for (const m of matches) {
      expect(m.affiliateScore).toBeGreaterThanOrEqual(0);
      expect(m.affiliateScore).toBeLessThanOrEqual(1);
    }
  });

  it("product name is title-cased from ingredient name", () => {
    const ingredients: Ingredient[] = [
      { name: "all-purpose flour", category: "pantry", optional: false },
    ];

    const matches = computeProductMatches(ingredients);
    expect(matches[0]?.productName).toBe("All-purpose Flour");
  });

  it("includes substitutes for known ingredients", () => {
    const ingredients: Ingredient[] = [
      { name: "butter", category: "dairy", optional: false },
    ];

    const matches = computeProductMatches(ingredients);
    expect(matches[0]?.substitutes).toContain("coconut oil");
  });

  it("includes price range with min <= max", () => {
    const ingredients: Ingredient[] = [
      { name: "salmon fillet", category: "seafood", optional: false },
    ];

    const matches = computeProductMatches(ingredients);
    const price = matches[0]?.estimatedPrice;
    expect(price?.min).toBeLessThanOrEqual(price?.max ?? 0);
    expect(price?.currency).toBe("USD");
  });

  it("commission rate is positive for all categories", () => {
    const categories: Ingredient["category"][] = [
      "pantry", "fresh", "dairy", "meat", "seafood", "equipment", "specialty", "other"
    ];

    for (const cat of categories) {
      const [match] = computeProductMatches([{ name: `item-${cat}`, category: cat, optional: false }]);
      expect(match?.commissionRate).toBeGreaterThan(0);
    }
  });

  it("passes through is_optional from ingredient", () => {
    const ingredients: Ingredient[] = [
      { name: "fresh parsley", category: "fresh", optional: true },
      { name: "olive oil", category: "pantry", optional: false },
    ];

    const matches = computeProductMatches(ingredients);
    expect(matches.find((m) => m.ingredient === "fresh parsley")?.is_optional).toBe(true);
    expect(matches.find((m) => m.ingredient === "olive oil")?.is_optional).toBe(false);
  });
});

// ============================================================================
// buildShoppingList
// ============================================================================

describe("buildShoppingList", () => {
  const makeMatch = (name: string, score: number, minPrice: number, maxPrice: number) => ({
    ingredient: name,
    productName: name,
    category: "pantry" as Ingredient["category"],
    is_optional: false,
    affiliateProgram: "amazon_associates" as const,
    estimatedPrice: { min: minPrice, max: maxPrice, currency: "USD" as const },
    commissionRate: 0.04,
    affiliateScore: score,
    substitutes: [],
  });

  it("returns correct recipe name", () => {
    const list = buildShoppingList("Pasta Carbonara", []);
    expect(list.recipeName).toBe("Pasta Carbonara");
  });

  it("sorts products by affiliate score descending", () => {
    const products = [
      makeMatch("flour", 0.2, 2, 5),
      makeMatch("skillet", 0.8, 50, 150),
      makeMatch("salt", 0.1, 1, 3),
    ];

    const list = buildShoppingList("Test Recipe", products);
    expect(list.products[0]?.ingredient).toBe("skillet");
    expect(list.products[2]?.ingredient).toBe("salt");
  });

  it("calculates total estimated cost correctly", () => {
    const products = [
      makeMatch("flour", 0.2, 2, 5),
      makeMatch("butter", 0.3, 4, 8),
    ];

    const list = buildShoppingList("Test Recipe", products);
    expect(list.totalEstimatedCost.min).toBe(6);
    expect(list.totalEstimatedCost.max).toBe(13);
  });

  it("calculates estimated commission as price × commissionRate per item", () => {
    const products = [
      makeMatch("flour", 0.2, 2, 5),   // 2*0.04=0.08 min, 5*0.04=0.20 max
      makeMatch("butter", 0.3, 4, 8),  // 4*0.04=0.16 min, 8*0.04=0.32 max
    ];

    const list = buildShoppingList("Test Recipe", products);
    expect(list.estimatedCommission.min).toBe(0.24);
    expect(list.estimatedCommission.max).toBe(0.52);
  });

  it("returns empty products for empty ingredient list", () => {
    const list = buildShoppingList("Empty Recipe", []);
    expect(list.products).toHaveLength(0);
    expect(list.totalEstimatedCost.min).toBe(0);
    expect(list.totalEstimatedCost.max).toBe(0);
  });
});

// ============================================================================
// equipmentToIngredients
// ============================================================================

describe("equipmentToIngredients", () => {
  it("converts required equipment to non-optional ingredient with category=equipment", () => {
    const equipment: Equipment[] = [
      { name: "Dutch oven", category: "cookware", requiredForRecipe: true },
      { name: "chef's knife", category: "tool", requiredForRecipe: true },
    ];
    const result = equipmentToIngredients(equipment);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ name: "Dutch oven", category: "equipment", optional: false });
    expect(result[1]).toMatchObject({ name: "chef's knife", category: "equipment", optional: false });
  });

  it("marks optional=true for equipment where requiredForRecipe is false", () => {
    const equipment: Equipment[] = [
      { name: "stand mixer", category: "appliance", requiredForRecipe: false },
    ];
    const result = equipmentToIngredients(equipment);
    expect(result[0]).toMatchObject({ name: "stand mixer", category: "equipment", optional: true });
  });

  it("returns empty array for no equipment", () => {
    expect(equipmentToIngredients([])).toEqual([]);
  });
});

// ============================================================================
// extractIngredientBrand
// ============================================================================

describe("extractIngredientBrand", () => {
  it("extracts single-word brand from branded ingredient", () => {
    expect(extractIngredientBrand("Maldon salt")).toBe("Maldon");
    expect(extractIngredientBrand("Kikkoman soy sauce")).toBe("Kikkoman");
  });

  it("extracts two-word brand when both words are capitalised", () => {
    expect(extractIngredientBrand("San Marzano tomatoes")).toBe("San Marzano");
    expect(extractIngredientBrand("Le Creuset Dutch oven")).toBe("Le Creuset");
  });

  it("returns undefined for all-lowercase ingredient names", () => {
    expect(extractIngredientBrand("all-purpose flour")).toBeUndefined();
    expect(extractIngredientBrand("olive oil")).toBeUndefined();
  });

  it("returns undefined for common capitalised descriptors", () => {
    expect(extractIngredientBrand("Kosher salt")).toBeUndefined();
    expect(extractIngredientBrand("Italian sausage")).toBeUndefined();
    expect(extractIngredientBrand("Fresh basil")).toBeUndefined();
  });

  it("surfaces brand in computeProductMatches output", () => {
    const ingredients: Ingredient[] = [
      { name: "Maldon salt", category: "pantry", optional: false },
      { name: "olive oil", category: "pantry", optional: false },
    ];
    const matches = computeProductMatches(ingredients);
    const maldon = matches.find((m) => m.ingredient === "Maldon salt");
    const oil = matches.find((m) => m.ingredient === "olive oil");
    expect(maldon?.brand).toBe("Maldon");
    expect(oil?.brand).toBeUndefined();
  });
});

// ============================================================================
// extractRecipeIngredients — mocked OpenAI
// ============================================================================

describe("extractRecipeIngredients (mocked OpenAI)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls OpenAI and returns normalized extraction result", async () => {
    const mockResponse = {
      recipe_name: "Chocolate Chip Cookies",
      ingredients: [
        { name: "all-purpose flour", quantity: "2", unit: "cups", category: "pantry", optional: false },
        { name: "butter", quantity: "1", unit: "cup", category: "dairy", optional: false },
        { name: "chocolate chips", quantity: "2", unit: "cups", category: "specialty", optional: false },
      ],
      equipment: [
        { name: "stand mixer", category: "appliance", required_for_recipe: false },
        { name: "baking sheet", category: "bakeware", required_for_recipe: true },
      ],
      techniques: ["cream", "fold", "bake"],
      cuisine_type: "American",
      difficulty: "easy",
    };

    const mockClient = {
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [
              { message: { content: JSON.stringify(mockResponse) } },
            ],
            usage: { prompt_tokens: 100, completion_tokens: 50 },
          }),
        },
      },
    };

    const { extractRecipeIngredients, setOpenAIClient } = await import("../src/extractor.js");
    setOpenAIClient(mockClient as unknown as import("openai").default);

    const result = await extractRecipeIngredients({
      transcript: "Today we are making chocolate chip cookies...",
    });

    expect(result.result.recipeName).toBe("Chocolate Chip Cookies");
    expect(result.result.ingredients).toHaveLength(3);
    expect(result.result.equipment).toHaveLength(2);
    expect(result.result.techniques).toContain("bake");
    expect(result.result.cuisineType).toBe("American");
    expect(result.result.difficulty).toBe("easy");
    expect(result.ai_cost_usd).toBeGreaterThan(0);
  });

  it("handles empty/invalid OpenAI response gracefully", async () => {
    const mockClient = {
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [{ message: { content: "not valid json {{" } }],
            usage: null,
          }),
        },
      },
    };

    const { extractRecipeIngredients, setOpenAIClient } = await import("../src/extractor.js");
    setOpenAIClient(mockClient as unknown as import("openai").default);

    const result = await extractRecipeIngredients({
      transcript: "Some cooking transcript here.",
    });

    expect(result.result.recipeName).toBe("Unknown Recipe");
    expect(result.result.ingredients).toHaveLength(0);
    expect(result.ai_cost_usd).toBe(0);
  });

  it("uses provided recipeId instead of deriving one", async () => {
    const mockClient = {
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    recipe_name: "Test",
                    ingredients: [],
                    equipment: [],
                    techniques: [],
                  }),
                },
              },
            ],
            usage: null,
          }),
        },
      },
    };

    const { extractRecipeIngredients, setOpenAIClient } = await import("../src/extractor.js");
    setOpenAIClient(mockClient as unknown as import("openai").default);

    const result = await extractRecipeIngredients({
      transcript: "A cooking transcript.",
      recipeId: "my-custom-id",
    });

    expect(result.recipeId).toBe("my-custom-id");
  });

  // EXP-2026-03-11-3: aesthetic tags coverage
  it("attaches aestheticTags to ExtractionResult when aesthetic fields are present in response", async () => {
    const mockClient = {
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    recipe_name: "Pasta Carbonara",
                    ingredients: [],
                    equipment: [],
                    techniques: ["boil", "toss"],
                    aesthetic_warmth: "warm",
                    aesthetic_density: "maximal",
                    aesthetic_origin: "natural",
                    aesthetic_tradition: "traditional",
                  }),
                },
              },
            ],
            usage: null,
          }),
        },
      },
    };

    const { extractRecipeIngredients, setOpenAIClient } = await import("../src/extractor.js");
    setOpenAIClient(mockClient as unknown as import("openai").default);

    const result = await extractRecipeIngredients({ transcript: "A carbonara recipe transcript." });
    expect(result.result.aestheticTags).toBeDefined();
    expect(result.result.aestheticTags?.warmth).toBe("warm");
    expect(result.result.aestheticTags?.density).toBe("maximal");
    expect(result.result.aestheticTags?.origin).toBe("natural");
    expect(result.result.aestheticTags?.tradition).toBe("traditional");
  });

  it("omits aestheticTags from ExtractionResult when aesthetic fields are absent in response", async () => {
    const mockClient = {
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    recipe_name: "Simple Omelette",
                    ingredients: [],
                    equipment: [],
                    techniques: ["whisk", "fold"],
                  }),
                },
              },
            ],
            usage: null,
          }),
        },
      },
    };

    const { extractRecipeIngredients, setOpenAIClient } = await import("../src/extractor.js");
    setOpenAIClient(mockClient as unknown as import("openai").default);

    const result = await extractRecipeIngredients({ transcript: "A simple omelette transcript." });
    expect(result.result.aestheticTags).toBeUndefined();
  });
});
