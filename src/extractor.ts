/**
 * Recipe Ingredient Extractor — OpenAI-based + local product matching
 *
 * Uses GPT-4o-mini to extract recipes and ingredients from cooking video transcripts.
 * Local logic handles product matching and affiliate scoring — no extra API calls.
 *
 * Exported API:
 *   setOpenAIClient()         — inject client for testing
 *   resolveTranscript()       — fetch YouTube transcript or pass raw text
 *   extractRecipeIngredients()— main async extraction
 *   normalizeIngredients()    — normalize raw OpenAI ingredient list
 *   normalizeEquipment()      — normalize raw OpenAI equipment list
 *   computeProductMatches()   — match ingredients to products with affiliate data
 *   buildShoppingList()       — rank products by affiliate opportunity
 */

import OpenAI from "openai";
import type {
  Ingredient,
  IngredientCategory,
  Equipment,
  ExtractionResult,
  OpenAIIngredientResponse,
  ProductMatch,
  AffiliateProgram,
  ShoppingList,
  DifficultyLevel,
  AestheticTags,
} from "./types.js";
import { YoutubeTranscript } from "youtube-transcript";
import { createHash } from "node:crypto";

// ============================================================================
// CLIENT INJECTION
// ============================================================================

let _openAIClient: OpenAI | null = null;

/**
 * Inject a custom OpenAI client. Useful for testing (mock injection).
 */
export function setOpenAIClient(client: OpenAI): void {
  _openAIClient = client;
}

function getOpenAIClient(): OpenAI {
  if (_openAIClient) return _openAIClient;
  const apiKey = process.env["OPENAI_API_KEY"];
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY environment variable is not set. " +
      "Set it to use the extraction tools."
    );
  }
  _openAIClient = new OpenAI({ apiKey });
  return _openAIClient;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const OPENAI_MODEL = "gpt-4o-mini";
const INPUT_COST_PER_1K = 0.000_150;   // $0.15 / 1M tokens
const OUTPUT_COST_PER_1K = 0.000_600;  // $0.60 / 1M tokens

const VALID_CATEGORIES = new Set<IngredientCategory>([
  "pantry", "fresh", "dairy", "meat", "seafood",
  "equipment", "specialty", "other",
]);

const VALID_DIFFICULTIES = new Set<DifficultyLevel>(["easy", "medium", "hard"]);

const VALID_WARMTH = new Set(["warm", "cool", "neutral"]);
const VALID_DENSITY = new Set(["minimal", "maximal", "balanced"]);
const VALID_ORIGIN = new Set(["natural", "synthetic", "mixed"]);
const VALID_TRADITION = new Set(["traditional", "contemporary", "hybrid"]);

// ============================================================================
// AFFILIATE SCORING DATA
// ============================================================================

/**
 * Commission rates by category (typical affiliate program rates).
 * Equipment has highest rates — cookware affiliates pay 8–12%.
 */
const CATEGORY_COMMISSION_RATE: Record<IngredientCategory, number> = {
  equipment: 0.10,    // 10% — cookware, knives, appliances
  specialty: 0.07,    // 7%  — specialty food items, premium pantry
  pantry: 0.04,       // 4%  — dry goods, canned items
  dairy: 0.03,        // 3%  — dairy products
  meat: 0.03,         // 3%  — meat, poultry
  seafood: 0.04,      // 4%  — seafood
  fresh: 0.02,        // 2%  — fresh produce (lower margin)
  other: 0.03,        // 3%  — default
};

/**
 * Best affiliate program by category.
 */
const CATEGORY_AFFILIATE_PROGRAM: Record<IngredientCategory, AffiliateProgram> = {
  equipment: "williams_sonoma",
  specialty: "thrive_market",
  pantry: "amazon_associates",
  dairy: "instacart",
  meat: "instacart",
  seafood: "instacart",
  fresh: "instacart",
  other: "amazon_associates",
};

/**
 * Typical price ranges (USD) by category.
 */
const CATEGORY_PRICE_RANGE: Record<IngredientCategory, { min: number; max: number }> = {
  equipment: { min: 25, max: 200 },
  specialty: { min: 8, max: 45 },
  pantry: { min: 2, max: 15 },
  dairy: { min: 3, max: 12 },
  meat: { min: 8, max: 40 },
  seafood: { min: 10, max: 50 },
  fresh: { min: 1, max: 8 },
  other: { min: 3, max: 20 },
};

// ============================================================================
// SYSTEM PROMPT
// ============================================================================

const EXTRACTION_SYSTEM_PROMPT = `You are a culinary intelligence extractor specialized in cooking video transcripts.

Extract the recipe and all ingredients from the provided cooking video transcript.

For each ingredient:
- name: Exact ingredient name (e.g., "all-purpose flour", "kosher salt", "extra-virgin olive oil")
- quantity: Amount if mentioned (e.g., "2", "1/4", "a pinch of") — omit if unclear
- unit: Measurement unit if present (e.g., "cups", "tablespoons", "grams") — omit if unclear
- category: One of exactly: pantry, fresh, dairy, meat, seafood, specialty, other
- optional: true if the host says it's optional, garnish, or "to taste" — false otherwise

For equipment mentioned:
- name: Equipment name (e.g., "cast iron skillet", "stand mixer", "Dutch oven")
- category: "cookware", "bakeware", "appliance", "tool", or "other"
- required_for_recipe: true if essential, false if optional or alternative suggested

Also extract:
- recipe_name: The dish being made
- techniques: Cooking techniques used (e.g., ["sauté", "fold", "blanch"])
- cuisine_type: Cuisine style if identifiable (e.g., "Italian", "Thai") — omit if unclear
- difficulty: "easy", "medium", or "hard" based on techniques and time — omit if unclear

Also classify the overall aesthetic character of this dish:
- aesthetic_warmth: "warm" (comforting, cozy, hearty), "cool" (fresh, light, crisp), or "neutral"
- aesthetic_density: "minimal" (simple, few ingredients, clean), "maximal" (rich, layered, complex), or "balanced"
- aesthetic_origin: "natural" (whole foods, seasonal, unprocessed), "synthetic" (convenience, processed, packaged), or "mixed"
- aesthetic_tradition: "traditional" (heritage recipe, classic technique), "contemporary" (modern twist, fusion), or "hybrid"

Rules:
- Focus on specific, purchasable ingredients — not vague references
- Include specialty/branded ingredients when named (e.g., "San Marzano tomatoes", "Maldon salt")
- Equipment category "equipment" is reserved for the IngredientCategory type — use "cookware" etc. for equipment.category

Return ONLY valid JSON (no markdown, no explanation):
{"recipe_name":"...","ingredients":[...],"equipment":[...],"techniques":[...],"cuisine_type":"...","difficulty":"...","aesthetic_warmth":"...","aesthetic_density":"...","aesthetic_origin":"...","aesthetic_tradition":"..."}`;

// ============================================================================
// YOUTUBE TRANSCRIPT RESOLVER
// ============================================================================

const YOUTUBE_ID_PATTERNS = [
  /[?&]v=([a-zA-Z0-9_-]{11})/,
  /youtu\.be\/([a-zA-Z0-9_-]{11})/,
  /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
];

function extractVideoId(url: string): string | null {
  for (const pattern of YOUTUBE_ID_PATTERNS) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

/**
 * Resolve a transcript input to plain text.
 * If the input is a YouTube URL, fetches the transcript via youtube-transcript.
 * Otherwise, returns the input as-is (raw text).
 */
export async function resolveTranscript(input: string): Promise<{ text: string; recipeId: string }> {
  const trimmed = input.trim();

  const videoId = extractVideoId(trimmed);
  if (videoId) {
    let segments;
    try {
      segments = await YoutubeTranscript.fetchTranscript(videoId);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to fetch YouTube transcript for "${videoId}": ${message}`);
    }

    if (!segments || segments.length === 0) {
      throw new Error(`No transcript available for YouTube video "${videoId}".`);
    }

    const text = segments
      .map((seg) => seg.text.replace(/\[.*?\]/g, "").trim())
      .filter((t) => t.length > 0)
      .join(" ");

    return { text, recipeId: videoId };
  }

  // Raw transcript text — derive stable ID from content hash
  if (!trimmed) {
    throw new Error("Transcript text is empty.");
  }
  const recipeId = createHash("sha256")
    .update(trimmed.slice(0, 200))
    .digest("hex")
    .slice(0, 16);

  return { text: trimmed, recipeId };
}

// ============================================================================
// NORMALIZE HELPERS
// ============================================================================

/**
 * Normalize raw OpenAI ingredient array into typed Ingredient[].
 * Falls back to "other" for invalid categories. Deduplicates by name.
 */
export function normalizeIngredients(
  raw: OpenAIIngredientResponse["ingredients"],
): Ingredient[] {
  const seen = new Map<string, Ingredient>();

  for (const item of raw) {
    const name = (item.name ?? "").trim();
    if (!name) continue;

    const key = name.toLowerCase();
    if (seen.has(key)) continue;

    const category: IngredientCategory = VALID_CATEGORIES.has(item.category as IngredientCategory)
      ? (item.category as IngredientCategory)
      : "other";

    const ingredient: Ingredient = {
      name,
      category,
      optional: Boolean(item.optional),
    };

    if (item.quantity) ingredient.quantity = String(item.quantity);
    if (item.unit) ingredient.unit = String(item.unit);

    seen.set(key, ingredient);
  }

  return [...seen.values()];
}

/**
 * Normalize raw OpenAI equipment array into typed Equipment[].
 */
export function normalizeEquipment(
  raw: OpenAIIngredientResponse["equipment"],
): Equipment[] {
  const seen = new Map<string, Equipment>();

  for (const item of raw) {
    const name = (item.name ?? "").trim();
    if (!name) continue;

    const key = name.toLowerCase();
    if (seen.has(key)) continue;

    seen.set(key, {
      name,
      category: (item.category ?? "other").trim() || "other",
      requiredForRecipe: Boolean(item.required_for_recipe),
    });
  }

  return [...seen.values()];
}

// ============================================================================
// MAIN EXTRACTION
// ============================================================================

export interface ExtractRecipeParams {
  transcript: string;     // raw text or YouTube URL
  recipeId?: string;      // optional override
}

export interface RawExtractionResult {
  recipeId: string;
  result: ExtractionResult;
  ai_cost_usd: number;
}

/**
 * Extract recipe and ingredients from a cooking video transcript using OpenAI.
 */
export async function extractRecipeIngredients(
  params: ExtractRecipeParams,
): Promise<RawExtractionResult> {
  const { transcript } = params;

  const { text, recipeId: derivedId } = await resolveTranscript(transcript);
  const recipeId = params.recipeId ?? derivedId;

  const client = getOpenAIClient();

  const userMessage = `Extract recipe ingredients and equipment from this cooking video transcript:\n\n${text}`;

  const response = await client.chat.completions.create({
    model: OPENAI_MODEL,
    messages: [
      { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
    response_format: { type: "json_object" },
    temperature: 0,
    max_tokens: 2000,
  });

  const rawContent = response.choices[0]?.message?.content ?? "{}";
  let parsed: OpenAIIngredientResponse;

  try {
    parsed = JSON.parse(rawContent) as OpenAIIngredientResponse;
  } catch {
    parsed = {
      recipe_name: "Unknown Recipe",
      ingredients: [],
      equipment: [],
      techniques: [],
    };
  }

  const ingredients = normalizeIngredients(
    Array.isArray(parsed.ingredients) ? parsed.ingredients : []
  );
  const equipment = normalizeEquipment(
    Array.isArray(parsed.equipment) ? parsed.equipment : []
  );
  const techniques = Array.isArray(parsed.techniques) ? parsed.techniques.filter(Boolean) : [];

  const difficulty = VALID_DIFFICULTIES.has(parsed.difficulty as DifficultyLevel)
    ? (parsed.difficulty as DifficultyLevel)
    : undefined;

  const result: ExtractionResult = {
    recipeName: (parsed.recipe_name ?? "Unknown Recipe").trim() || "Unknown Recipe",
    ingredients,
    equipment,
    techniques,
  };

  if (parsed.cuisine_type) result.cuisineType = parsed.cuisine_type;
  if (difficulty) result.difficulty = difficulty;

  const aestheticTags = parseAestheticTags(parsed);
  if (aestheticTags) result.aestheticTags = aestheticTags;

  // Estimate cost from token usage
  const usage = response.usage;
  const ai_cost_usd = usage
    ? (usage.prompt_tokens / 1000) * INPUT_COST_PER_1K +
      (usage.completion_tokens / 1000) * OUTPUT_COST_PER_1K
    : 0;

  return { recipeId, result, ai_cost_usd };
}

// ============================================================================
// PRODUCT MATCHING
// ============================================================================

/**
 * Match a list of ingredients to purchasable products with affiliate data.
 * Pure local computation — no API calls.
 */
export function computeProductMatches(ingredients: Ingredient[]): ProductMatch[] {
  return ingredients.map((ingredient) => {
    const category = ingredient.category;
    const priceRange = CATEGORY_PRICE_RANGE[category];
    const commissionRate = CATEGORY_COMMISSION_RATE[category];
    const affiliateProgram = CATEGORY_AFFILIATE_PROGRAM[category];

    // Affiliate score: higher for equipment (high commission + basket size),
    // lower for fresh produce (low margin + local competition).
    // Formula: commissionRate * price midpoint / 100, capped 0–1
    const priceMid = (priceRange.min + priceRange.max) / 2;
    const rawScore = commissionRate * (priceMid / 20); // normalize around $20 midpoint
    const affiliateScore = Math.min(Math.max(rawScore, 0), 1);

    // Build substitutes list (simple category-based suggestions) — omit when empty
    const substitutes = buildSubstitutes(ingredient.name, category);

    const match: ProductMatch = {
      ingredient: ingredient.name,
      productName: toTitleCase(ingredient.name),
      category,
      affiliateProgram,
      estimatedPrice: {
        min: priceRange.min,
        max: priceRange.max,
        currency: "USD",
      },
      commissionRate,
      affiliateScore: Math.round(affiliateScore * 100) / 100,
      ...(substitutes.length > 0 ? { substitutes } : {}),
    };

    return match;
  });
}

/**
 * Build a shopping list ranked by affiliate opportunity.
 */
export function buildShoppingList(
  recipeName: string,
  products: ProductMatch[],
): ShoppingList {
  // Sort by affiliate score descending
  const sorted = [...products].sort((a, b) => b.affiliateScore - a.affiliateScore);

  // Total estimated cost ranges
  const totalMin = products.reduce((sum, p) => sum + p.estimatedPrice.min, 0);
  const totalMax = products.reduce((sum, p) => sum + p.estimatedPrice.max, 0);

  return {
    recipeName,
    products: sorted,
    totalEstimatedCost: { min: totalMin, max: totalMax },
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function toTitleCase(str: string): string {
  return str
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Return simple generic substitutes based on ingredient name and category.
 * These are static suggestions — not AI-generated.
 */
function buildSubstitutes(name: string, category: IngredientCategory): string[] {
  const lower = name.toLowerCase();

  // Common substitution pairs
  const SUBSTITUTION_MAP: Record<string, string[]> = {
    "butter": ["margarine", "coconut oil", "olive oil"],
    "milk": ["oat milk", "almond milk", "soy milk"],
    "heavy cream": ["coconut cream", "half-and-half", "cashew cream"],
    "all-purpose flour": ["bread flour", "gluten-free flour blend", "almond flour"],
    "olive oil": ["avocado oil", "vegetable oil", "canola oil"],
    "garlic": ["garlic powder", "shallots"],
    "onion": ["shallots", "leeks", "scallions"],
    "sugar": ["honey", "maple syrup", "coconut sugar"],
    "soy sauce": ["tamari", "coconut aminos", "worcestershire sauce"],
    "lemon juice": ["lime juice", "white wine vinegar"],
    "eggs": ["flax egg", "chia egg", "applesauce"],
    "breadcrumbs": ["panko", "crushed crackers", "almond meal"],
  };

  if (SUBSTITUTION_MAP[lower]) {
    return SUBSTITUTION_MAP[lower];
  }

  // Category-level fallbacks
  const CATEGORY_FALLBACKS: Partial<Record<IngredientCategory, string[]>> = {
    fresh: ["frozen equivalent", "canned equivalent"],
    dairy: ["plant-based alternative"],
    meat: ["plant-based protein alternative"],
    seafood: ["canned equivalent", "frozen equivalent"],
  };

  return CATEGORY_FALLBACKS[category] ?? [];
}

/**
 * Parse and validate aesthetic tag fields from a raw OpenAI ingredient response.
 * Returns undefined if no valid tags present.
 */
function parseAestheticTags(parsed: OpenAIIngredientResponse): AestheticTags | undefined {
  const warmth = VALID_WARMTH.has(parsed.aesthetic_warmth ?? "") ? parsed.aesthetic_warmth as AestheticTags["warmth"] : null;
  const density = VALID_DENSITY.has(parsed.aesthetic_density ?? "") ? parsed.aesthetic_density as AestheticTags["density"] : null;
  const origin = VALID_ORIGIN.has(parsed.aesthetic_origin ?? "") ? parsed.aesthetic_origin as AestheticTags["origin"] : null;
  const tradition = VALID_TRADITION.has(parsed.aesthetic_tradition ?? "") ? parsed.aesthetic_tradition as AestheticTags["tradition"] : null;

  if (!warmth && !density && !origin && !tradition) return undefined;

  return {
    warmth: warmth ?? "neutral",
    density: density ?? "balanced",
    origin: origin ?? "mixed",
    tradition: tradition ?? "hybrid",
  };
}
