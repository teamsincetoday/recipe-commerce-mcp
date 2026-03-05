/**
 * Recipe Commerce Intelligence MCP — Public API
 *
 * Export the server factory and key types for programmatic use.
 */

export { createServer, startStdioServer } from "./server.js";
export { getCache, RecipeCache, FREE_TIER_DAILY_LIMIT } from "./cache.js";
export {
  extractRecipeIngredients,
  computeProductMatches,
  buildShoppingList,
  resolveTranscript,
  normalizeIngredients,
  normalizeEquipment,
  setOpenAIClient,
} from "./extractor.js";

export type {
  Ingredient,
  IngredientCategory,
  Equipment,
  ExtractionResult,
  ProductMatch,
  ShoppingList,
  AffiliateProgram,
  DifficultyLevel,
  AuthResult,
  PaymentMethod,
  ExtractionMeta,
  ExtractionResponse,
} from "./types.js";
