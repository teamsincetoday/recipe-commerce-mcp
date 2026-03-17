/**
 * Recipe Commerce Intelligence MCP — Core Types
 *
 * Single source of truth for all types shared across cache, extractor, and server.
 */

// ============================================================================
// ENUMS / UNION TYPES
// ============================================================================

export type IngredientCategory =
  | "pantry"
  | "fresh"
  | "dairy"
  | "meat"
  | "seafood"
  | "equipment"
  | "specialty"
  | "other";

export type AffiliateProgram =
  | "amazon_associates"
  | "thrive_market"
  | "instacart"
  | "williams_sonoma"
  | "other";

export type DifficultyLevel = "easy" | "medium" | "hard";

export interface AestheticTags {
  warmth: "warm" | "cool" | "neutral";
  density: "minimal" | "maximal" | "balanced";
  origin: "natural" | "synthetic" | "mixed";
  tradition: "traditional" | "contemporary" | "hybrid";
}

export type PaymentMethod = "disabled" | "api_key" | "free_tier";

// ============================================================================
// CORE ENTITIES
// ============================================================================

export interface Ingredient {
  name: string;
  quantity?: string;
  unit?: string;
  category: IngredientCategory;
  optional: boolean;
}

export interface Equipment {
  name: string;
  category: string;
  requiredForRecipe: boolean;
}

// ============================================================================
// EXTRACTION RESULT
// ============================================================================

export interface ExtractionResult {
  recipeName: string;
  ingredients: Ingredient[];
  equipment: Equipment[];
  techniques: string[];
  cuisineType?: string;
  difficulty?: DifficultyLevel;
  aestheticTags?: AestheticTags;
}

// ============================================================================
// PRODUCT MATCHING
// ============================================================================

export interface ProductMatch {
  ingredient: string;
  productName: string;
  brand?: string;
  category: IngredientCategory;
  is_optional: boolean;
  affiliateProgram: AffiliateProgram;
  estimatedPrice: {
    min: number;
    max: number;
    currency: "USD";
  };
  commissionRate: number;
  affiliateScore: number;
  substitutes?: string[];
}

// ============================================================================
// SHOPPING LIST
// ============================================================================

export interface ShoppingList {
  recipeName: string;
  products: ProductMatch[];
  totalEstimatedCost: {
    min: number;
    max: number;
  };
  /** Estimated affiliate commission across all products (price × commissionRate). */
  estimatedCommission: {
    min: number;
    max: number;
  };
}

// ============================================================================
// OPENAI RAW RESPONSE SHAPES
// ============================================================================

export interface OpenAIIngredientResponse {
  recipe_name: string;
  ingredients: Array<{
    name: string;
    quantity?: string;
    unit?: string;
    category: string;
    optional: boolean;
  }>;
  equipment: Array<{
    name: string;
    category: string;
    required_for_recipe: boolean;
  }>;
  techniques: string[];
  cuisine_type?: string;
  difficulty?: string;
  aesthetic_warmth?: string;
  aesthetic_density?: string;
  aesthetic_origin?: string;
  aesthetic_tradition?: string;
}

// ============================================================================
// CACHE ENTRY
// ============================================================================

export interface CacheEntry {
  recipe_id: string;
  data: ExtractionResult;
  created_at: number;
}

// ============================================================================
// AUTH
// ============================================================================

export interface AuthResult {
  authorized: boolean;
  method?: PaymentMethod;
  reason?: string;
}

// ============================================================================
// EXTRACTION META
// ============================================================================

export interface ExtractionMeta {
  processing_time_ms: number;
  ai_cost_usd: number;
  cache_hit: boolean;
  recipe_id: string;
}

export interface ExtractionResponse {
  result: ExtractionResult;
  _meta: ExtractionMeta;
}
