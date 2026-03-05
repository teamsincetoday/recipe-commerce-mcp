/**
 * Recipe Commerce Intelligence MCP Server
 *
 * Three tools for the agent-to-agent economy:
 *   extract_recipe_ingredients   — Extract recipe and ingredients from a cooking video
 *   match_ingredients_to_products — Match ingredients to purchasable products
 *   suggest_affiliate_products   — Build a ranked affiliate shopping list
 *
 * Payment: 3 free calls/day per agent, then API key required ($0.001/call).
 * Transport: stdio only (v0).
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { getCache, FREE_TIER_DAILY_LIMIT } from "./cache.js";
import {
  extractRecipeIngredients,
  computeProductMatches,
  buildShoppingList,
  normalizeIngredients,
} from "./extractor.js";
import type { AuthResult, ExtractionResult, Ingredient } from "./types.js";

// ============================================================================
// CONSTANTS
// ============================================================================

const SERVER_NAME = "recipe-commerce-intelligence";
const SERVER_VERSION = "0.1.0";
const TOOL_PRICE_USD = 0.001;

// ============================================================================
// AUTH
// ============================================================================

function getAgentId(): string {
  return process.env["AGENT_ID"] ?? "anonymous";
}

function getApiKeys(): Set<string> {
  const raw = process.env["MCP_API_KEYS"] ?? "";
  const keys = raw
    .split(",")
    .map((k) => k.trim())
    .filter((k) => k.length > 0);
  return new Set(keys);
}

/**
 * Check authorization. Order:
 * 1. Payments disabled (PAYMENT_ENABLED != "true") -> always authorized
 * 2. API key -> authorized
 * 3. Free tier quota -> authorized if remaining
 * 4. Deny
 */
function authorize(agentId: string, apiKey?: string): AuthResult {
  const paymentEnabled = process.env["PAYMENT_ENABLED"] === "true";

  if (!paymentEnabled) {
    return { authorized: true, method: "disabled" };
  }

  if (apiKey) {
    const keys = getApiKeys();
    if (keys.has(apiKey)) {
      return { authorized: true, method: "api_key" };
    }
  }

  const cache = getCache();
  if (cache.checkFreeTier(agentId)) {
    return { authorized: true, method: "free_tier" };
  }

  const used = cache.getFreeTierUsed(agentId);
  return {
    authorized: false,
    reason: `Free tier exhausted (${used}/${FREE_TIER_DAILY_LIMIT} calls used today). Set MCP_API_KEYS to continue.`,
  };
}

// ============================================================================
// ERROR HELPERS
// ============================================================================

function errorResult(message: string) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify({ error: message }) }],
    isError: true,
  };
}

function paymentRequiredResult(reason: string) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({
          error: "payment_required",
          message: reason,
          price_usd: TOOL_PRICE_USD,
          free_tier_limit: FREE_TIER_DAILY_LIMIT,
        }),
      },
    ],
    isError: true,
  };
}

// ============================================================================
// SERVER SETUP
// ============================================================================

export function createServer(): McpServer {
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  // --------------------------------------------------------------------------
  // TOOL 1: extract_recipe_ingredients
  // --------------------------------------------------------------------------

  server.tool(
    "extract_recipe_ingredients",
    "Extract recipe name, ingredient list (with quantity/unit/category), equipment, and cooking technique tags from a cooking video transcript or YouTube URL. Uses GPT-4o-mini. Results are cached by recipe_id.",
    {
      transcript: z
        .string()
        .min(1)
        .describe("Raw transcript text OR a YouTube URL (e.g. https://youtube.com/watch?v=...)"),
      recipe_id: z
        .string()
        .optional()
        .describe("Optional recipe identifier for caching. Auto-derived from content if omitted."),
      api_key: z
        .string()
        .optional()
        .describe("Optional API key for paid access beyond the free tier"),
    },
    async ({ transcript, recipe_id, api_key }) => {
      const start = Date.now();
      const agentId = getAgentId();

      const auth = authorize(agentId, api_key);
      if (!auth.authorized) {
        return paymentRequiredResult(auth.reason ?? "Payment required");
      }

      try {
        const cache = getCache();

        // Cache check — only if recipe_id was provided
        if (recipe_id) {
          const cached = cache.get(recipe_id);
          if (cached) {
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    result: cached,
                    _meta: {
                      processing_time_ms: Date.now() - start,
                      ai_cost_usd: 0,
                      cache_hit: true,
                      recipe_id,
                    },
                  }),
                },
              ],
            };
          }
        }

        const extracted = await extractRecipeIngredients({
          transcript,
          recipeId: recipe_id,
        });

        const processingTime = Date.now() - start;

        // Cache the extraction result
        if (recipe_id ?? extracted.recipeId) {
          cache.set(recipe_id ?? extracted.recipeId, extracted.result);
        }

        cache.recordUsage({
          agentId,
          toolName: "extract_recipe_ingredients",
          paymentMethod: auth.method ?? "disabled",
          amountUsd: auth.method === "api_key" ? TOOL_PRICE_USD : 0,
          success: true,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                result: extracted.result,
                _meta: {
                  processing_time_ms: processingTime,
                  ai_cost_usd: extracted.ai_cost_usd,
                  cache_hit: false,
                  recipe_id: recipe_id ?? extracted.recipeId,
                },
              }),
            },
          ],
        };
      } catch (err) {
        const cache = getCache();
        cache.recordUsage({
          agentId,
          toolName: "extract_recipe_ingredients",
          paymentMethod: auth.method ?? "disabled",
          amountUsd: 0,
          success: false,
        });
        const message = err instanceof Error ? err.message : String(err);
        return errorResult(`Extraction failed: ${message}`);
      }
    }
  );

  // --------------------------------------------------------------------------
  // TOOL 2: match_ingredients_to_products
  // --------------------------------------------------------------------------

  server.tool(
    "match_ingredients_to_products",
    "Match a list of ingredients to purchasable products with affiliate program details, price ranges, commission rates, and substitution alternatives. Accepts ingredient list directly or a recipe_id from a previous extraction.",
    {
      ingredients: z
        .array(
          z.object({
            name: z.string().min(1),
            quantity: z.string().optional(),
            unit: z.string().optional(),
            category: z
              .enum(["pantry", "fresh", "dairy", "meat", "seafood", "equipment", "specialty", "other"])
              .optional()
              .default("other"),
            optional: z.boolean().optional().default(false),
          })
        )
        .optional()
        .describe("Ingredient list from extract_recipe_ingredients. Provide this OR recipe_id."),
      recipe_id: z
        .string()
        .optional()
        .describe("Recipe ID from a prior extraction — loads ingredients from cache."),
      api_key: z
        .string()
        .optional()
        .describe("Optional API key for paid access beyond the free tier"),
    },
    async ({ ingredients: rawIngredients, recipe_id, api_key }) => {
      const start = Date.now();
      const agentId = getAgentId();

      const auth = authorize(agentId, api_key);
      if (!auth.authorized) {
        return paymentRequiredResult(auth.reason ?? "Payment required");
      }

      try {
        let ingredients: Ingredient[];

        if (recipe_id) {
          // Load from cache
          const cache = getCache();
          const cached: ExtractionResult | null = cache.get(recipe_id);
          if (!cached) {
            return errorResult(
              `No cached extraction found for recipe_id "${recipe_id}". ` +
              `Run extract_recipe_ingredients first.`
            );
          }
          ingredients = cached.ingredients;
        } else if (rawIngredients && rawIngredients.length > 0) {
          ingredients = normalizeIngredients(
            rawIngredients.map((i) => ({
              name: i.name,
              quantity: i.quantity,
              unit: i.unit,
              category: i.category ?? "other",
              optional: i.optional ?? false,
            }))
          );
        } else {
          return errorResult("Provide either 'ingredients' array or a 'recipe_id'.");
        }

        const products = computeProductMatches(ingredients);

        const cache = getCache();
        cache.recordUsage({
          agentId,
          toolName: "match_ingredients_to_products",
          paymentMethod: auth.method ?? "disabled",
          amountUsd: 0,
          success: true,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                products,
                ingredient_count: ingredients.length,
                _meta: {
                  processing_time_ms: Date.now() - start,
                  ai_cost_usd: 0,
                  cache_hit: Boolean(recipe_id),
                },
              }),
            },
          ],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return errorResult(`Product matching failed: ${message}`);
      }
    }
  );

  // --------------------------------------------------------------------------
  // TOOL 3: suggest_affiliate_products
  // --------------------------------------------------------------------------

  server.tool(
    "suggest_affiliate_products",
    "Given a recipe name and ingredient list, return a ranked shopping list with affiliate opportunity scores. Equipment items receive higher affiliate scores (10% commission). Returns top opportunities sorted by affiliate score.",
    {
      recipe_name: z
        .string()
        .min(1)
        .describe("Recipe name (e.g. 'Beef Bourguignon', 'Chocolate Chip Cookies')"),
      ingredients: z
        .array(
          z.object({
            name: z.string().min(1),
            quantity: z.string().optional(),
            unit: z.string().optional(),
            category: z
              .enum(["pantry", "fresh", "dairy", "meat", "seafood", "equipment", "specialty", "other"])
              .optional()
              .default("other"),
            optional: z.boolean().optional().default(false),
          })
        )
        .optional()
        .describe("Ingredient list. Provide this OR recipe_id."),
      recipe_id: z
        .string()
        .optional()
        .describe("Recipe ID from a prior extraction — loads from cache."),
      api_key: z
        .string()
        .optional()
        .describe("Optional API key for paid access beyond the free tier"),
    },
    async ({ recipe_name, ingredients: rawIngredients, recipe_id, api_key }) => {
      const start = Date.now();
      const agentId = getAgentId();

      const auth = authorize(agentId, api_key);
      if (!auth.authorized) {
        return paymentRequiredResult(auth.reason ?? "Payment required");
      }

      try {
        let ingredients: Ingredient[];

        if (recipe_id) {
          const cache = getCache();
          const cached: ExtractionResult | null = cache.get(recipe_id);
          if (!cached) {
            return errorResult(
              `No cached extraction found for recipe_id "${recipe_id}". ` +
              `Run extract_recipe_ingredients first.`
            );
          }
          ingredients = cached.ingredients;
        } else if (rawIngredients && rawIngredients.length > 0) {
          ingredients = normalizeIngredients(
            rawIngredients.map((i) => ({
              name: i.name,
              quantity: i.quantity,
              unit: i.unit,
              category: i.category ?? "other",
              optional: i.optional ?? false,
            }))
          );
        } else {
          return errorResult("Provide either 'ingredients' array or a 'recipe_id'.");
        }

        const products = computeProductMatches(ingredients);
        const shoppingList = buildShoppingList(recipe_name, products);

        const cache = getCache();
        cache.recordUsage({
          agentId,
          toolName: "suggest_affiliate_products",
          paymentMethod: auth.method ?? "disabled",
          amountUsd: 0,
          success: true,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                ...shoppingList,
                _meta: {
                  processing_time_ms: Date.now() - start,
                  ai_cost_usd: 0,
                  cache_hit: Boolean(recipe_id),
                },
              }),
            },
          ],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return errorResult(`Shopping list generation failed: ${message}`);
      }
    }
  );

  return server;
}

// ============================================================================
// TRANSPORT
// ============================================================================

export async function startStdioServer(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Server runs until stdin closes
}
