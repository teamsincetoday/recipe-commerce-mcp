/**
 * Recipe Commerce MCP — Cloudflare Workers Adapter
 *
 * Streamable HTTP transport for remote deployment.
 * Replaces SQLite cache with Workers KV.
 * Auth: API key or free tier (200 calls/day per IP via CF-Connecting-IP).
 *
 * Routes:
 *   GET  /health  — health check
 *   GET  /usage   — traction dashboard (tool call counts, 7-day)
 *   *    /mcp     — MCP Streamable HTTP endpoint (stateless)
 *   OPTIONS *     — CORS preflight
 *
 * OWASP MCP security guide compliant:
 *   - Finding 2: OpenAI errors wrapped generically (no raw error exposure)
 *   - Finding 3: Auth failures logged to TELEMETRY KV
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import OpenAI from "openai";

import {
  setOpenAIClient,
  extractRecipeIngredients,
  computeProductMatches,
  buildShoppingList,
  normalizeIngredients,
} from "./extractor.js";
import { CloudflareMetering } from "./metering-cloudflare.js";
import type { ExtractionResult, AuthResult, Ingredient } from "./types.js";

// ============================================================================
// CONSTANTS
// ============================================================================

const SERVER_NAME = "recipe-commerce-intelligence";
const SERVER_VERSION = "0.1.0";
const TOOL_PRICE_USD = 0.01;
const TOOL_NAMES = [
  "extract_recipe_ingredients",
  "match_ingredients_to_products",
  "suggest_affiliate_products",
] as const;

export const FREE_TIER_DAILY_LIMIT = 200;
export const TRANSCRIPT_MAX_CHARS = 100_000;
export const ID_MAX_CHARS = 200;
export const API_KEY_MAX_CHARS = 200;
export const RECIPE_NAME_MAX = 200;
export const INGREDIENT_NAME_MAX = 200;
export const INGREDIENT_QUANTITY_MAX = 50;

const CACHE_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days
const RATE_LIMIT_TTL_SECONDS = 90_000; // 25 hours — covers day boundary

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, mcp-session-id",
};

// ============================================================================
// CLOUDFLARE TYPES
// ============================================================================

interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}

// ============================================================================
// CLOUDFLARE ENV
// ============================================================================

export interface Env {
  RECIPE_CACHE: KVNamespace;
  RATE_LIMITS: KVNamespace;
  TELEMETRY?: KVNamespace;
  OPENAI_API_KEY: string;
  MCP_API_KEYS?: string;
  PAYMENT_ENABLED?: string;
}

// ============================================================================
// AUTH (KV-backed, IP-based free tier)
// ============================================================================

function getApiKeys(env: Env): Set<string> {
  const raw = env.MCP_API_KEYS ?? "";
  return new Set(
    raw
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean)
  );
}

async function checkFreeTier(kv: KVNamespace, ip: string): Promise<boolean> {
  const today = new Date().toISOString().split("T")[0];
  const key = `ratelimit:${ip}:${today}`;
  const raw = await kv.get(key);
  return (raw ? parseInt(raw, 10) : 0) < FREE_TIER_DAILY_LIMIT;
}

async function incrementFreeTier(kv: KVNamespace, ip: string): Promise<void> {
  const today = new Date().toISOString().split("T")[0];
  const key = `ratelimit:${ip}:${today}`;
  const raw = await kv.get(key);
  const count = raw ? parseInt(raw, 10) : 0;
  await kv.put(key, String(count + 1), { expirationTtl: RATE_LIMIT_TTL_SECONDS });
}

async function authorize(env: Env, request: Request, apiKey?: string): Promise<AuthResult> {
  const paymentEnabled = env.PAYMENT_ENABLED === "true";

  if (!paymentEnabled) {
    return { authorized: true, method: "disabled" };
  }

  if (apiKey) {
    if (getApiKeys(env).has(apiKey)) {
      return { authorized: true, method: "api_key" };
    }
  }

  const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
  if (await checkFreeTier(env.RATE_LIMITS, ip)) {
    await incrementFreeTier(env.RATE_LIMITS, ip);
    return { authorized: true, method: "free_tier" };
  }

  return {
    authorized: false,
    reason: `Free tier exhausted (${FREE_TIER_DAILY_LIMIT} calls/day per IP). Options: pay per call via x402, set api_key param, or contact team@sincetoday.com for enterprise access.`,
  };
}

// ============================================================================
// KV CACHE
// ============================================================================

async function cacheGet(kv: KVNamespace, id: string): Promise<ExtractionResult | null> {
  const raw = await kv.get(`recipe:extraction:${id}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ExtractionResult;
  } catch {
    return null;
  }
}

async function cacheSet(kv: KVNamespace, id: string, data: ExtractionResult): Promise<void> {
  await kv.put(`recipe:extraction:${id}`, JSON.stringify(data), {
    expirationTtl: CACHE_TTL_SECONDS,
  });
}

// ============================================================================
// RESPONSE HELPERS
// ============================================================================

function errorResult(message: string) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify({ error: message }) }],
    isError: true,
  };
}

function paymentRequiredResult(reason: string) {
  const resetAt = new Date(new Date().setUTCHours(24, 0, 0, 0)).toISOString();
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({
          error: "rate_limit_exceeded",
          message: reason,
          price_usd: TOOL_PRICE_USD,
          free_tier_limit: FREE_TIER_DAILY_LIMIT,
          reset_at: resetAt,
          options: {
            pay_per_call: {
              method: "x402 micropayments",
              price_usd: TOOL_PRICE_USD,
              setup: "Add STABLECOIN_ADDRESS env var — no account needed",
              doc: "https://x402.org",
            },
            api_key: {
              method: "api_key",
              param: "api_key",
              contact: "team@sincetoday.com",
            },
            enterprise: {
              description: "Building at scale? Custom rate limits, white-label endpoints, SLA guarantees, and custom extraction schemas.",
              contact: "team@sincetoday.com",
              subject_line: "Enterprise MCP — [your use case]",
              response_time: "Same business day",
            },
          },
        }),
      },
    ],
    isError: true,
  };
}

// ============================================================================
// MCP SERVER FACTORY
// ============================================================================

/** Map AuthResult payment method to metering method (disabled → free_tier). */
function meteringMethod(method: string | undefined): "api_key" | "free_tier" | "x402" {
  if (method === "api_key") return "api_key";
  if (method === "x402") return "x402";
  return "free_tier";
}

function createMcpServer(env: Env, request: Request, ctx: ExecutionContext): McpServer {
  const metering = env.TELEMETRY ? new CloudflareMetering(env.TELEMETRY) : null;

  // Inject OpenAI client with env secret (Workers-safe, no process.env)
  setOpenAIClient(new OpenAI({ apiKey: env.OPENAI_API_KEY }));

  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });

  // --------------------------------------------------------------------------
  // TOOL 1: extract_recipe_ingredients
  // --------------------------------------------------------------------------

  server.tool(
    "extract_recipe_ingredients",
    "Extract structured recipe data from a cooking video transcript or YouTube URL: recipe name, ingredients with quantity and unit, equipment list, and cooking technique tags. Returns a structured ingredient list ready for affiliate product matching and shopping list generation. Use for recipe monetization, cooking content commerce, and automated shoppable recipe creation. Results cached by recipe_id.",
    {
      transcript: z
        .string()
        .min(1)
        .max(TRANSCRIPT_MAX_CHARS)
        .describe("Raw transcript text OR a YouTube URL (e.g. https://youtube.com/watch?v=...)"),
      recipe_id: z
        .string()
        .max(ID_MAX_CHARS)
        .optional()
        .describe("Optional recipe identifier for caching. Auto-derived from content if omitted."),
      api_key: z
        .string()
        .max(API_KEY_MAX_CHARS)
        .optional()
        .describe("Optional API key for paid access beyond the free tier"),
    },
    async ({ transcript, recipe_id, api_key }) => {
      const start = Date.now();

      const auth = await authorize(env, request, api_key);
      if (!auth.authorized) {
        if (metering)
          ctx.waitUntil(
            metering.record({
              toolName: "_auth_failure",
              paymentMethod: "free_tier",
              processingTimeMs: 0,
              success: false,
            })
          );
        return paymentRequiredResult(auth.reason ?? "Payment required");
      }

      // Cache check — only if recipe_id provided
      if (recipe_id) {
        const cached = await cacheGet(env.RECIPE_CACHE, recipe_id);
        if (cached) {
          if (metering)
            ctx.waitUntil(
              metering.record({
                toolName: "extract_recipe_ingredients",
                paymentMethod: meteringMethod(auth.method),
                processingTimeMs: Date.now() - start,
                success: true,
              })
            );
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

      try {
        const extracted = await extractRecipeIngredients({
          transcript,
          recipeId: recipe_id,
        });

        const resolvedId = recipe_id ?? extracted.recipeId;
        if (resolvedId) {
          await cacheSet(env.RECIPE_CACHE, resolvedId, extracted.result);
        }

        if (metering)
          ctx.waitUntil(
            metering.record({
              toolName: "extract_recipe_ingredients",
              paymentMethod: meteringMethod(auth.method),
              amountUsd: auth.method === "api_key" ? TOOL_PRICE_USD : 0,
              processingTimeMs: Date.now() - start,
              success: true,
            })
          );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                result: extracted.result,
                _meta: {
                  processing_time_ms: Date.now() - start,
                  ai_cost_usd: extracted.ai_cost_usd,
                  cache_hit: false,
                  recipe_id: resolvedId,
                },
              }),
            },
          ],
        };
      } catch (err) {
        if (metering)
          ctx.waitUntil(
            metering.record({
              toolName: "extract_recipe_ingredients",
              paymentMethod: meteringMethod(auth.method),
              processingTimeMs: Date.now() - start,
              success: false,
            })
          );
        const message =
          err instanceof OpenAI.APIError
            ? "upstream service temporarily unavailable"
            : err instanceof Error
              ? err.message
              : "internal error";
        return errorResult(`Extraction failed: ${message}`);
      }
    }
  );

  // --------------------------------------------------------------------------
  // TOOL 2: match_ingredients_to_products
  // --------------------------------------------------------------------------

  server.tool(
    "match_ingredients_to_products",
    "Match recipe ingredients to purchasable products on Amazon and specialty retailers. Returns affiliate program details (Amazon Associates, ShareASale, Awin), price range, commission rate (2–10%), and substitution alternatives for each ingredient. Use for recipe affiliate monetization, ingredient sourcing intelligence, and shoppable recipe generation. Accepts ingredient list directly or recipe_id from a prior extract_recipe_ingredients call.",
    {
      ingredients: z
        .array(
          z.object({
            name: z.string().min(1).max(INGREDIENT_NAME_MAX),
            quantity: z.string().max(INGREDIENT_QUANTITY_MAX).optional(),
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
        .max(ID_MAX_CHARS)
        .optional()
        .describe("Recipe ID from a prior extraction — loads ingredients from cache."),
      api_key: z
        .string()
        .max(API_KEY_MAX_CHARS)
        .optional()
        .describe("Optional API key for paid access beyond the free tier"),
    },
    async ({ ingredients: rawIngredients, recipe_id, api_key }) => {
      const start = Date.now();

      const auth = await authorize(env, request, api_key);
      if (!auth.authorized) {
        if (metering)
          ctx.waitUntil(
            metering.record({
              toolName: "_auth_failure",
              paymentMethod: "free_tier",
              processingTimeMs: 0,
              success: false,
            })
          );
        return paymentRequiredResult(auth.reason ?? "Payment required");
      }

      try {
        let ingredients: Ingredient[];

        if (recipe_id) {
          const cached = await cacheGet(env.RECIPE_CACHE, recipe_id);
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

        if (metering)
          ctx.waitUntil(
            metering.record({
              toolName: "match_ingredients_to_products",
              paymentMethod: meteringMethod(auth.method),
              amountUsd: auth.method === "api_key" ? TOOL_PRICE_USD : 0,
              processingTimeMs: Date.now() - start,
              success: true,
            })
          );

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
        if (metering)
          ctx.waitUntil(
            metering.record({
              toolName: "match_ingredients_to_products",
              paymentMethod: meteringMethod(auth.method),
              processingTimeMs: Date.now() - start,
              success: false,
            })
          );
        const message =
          err instanceof OpenAI.APIError
            ? "upstream service temporarily unavailable"
            : err instanceof Error
              ? err.message
              : "internal error";
        return errorResult(`Product matching failed: ${message}`);
      }
    }
  );

  // --------------------------------------------------------------------------
  // TOOL 3: suggest_affiliate_products
  // --------------------------------------------------------------------------

  server.tool(
    "suggest_affiliate_products",
    "Generate a ranked affiliate shopping list for a recipe, scoring each ingredient and piece of equipment by affiliate revenue potential. Equipment scores highest (10% commission via Amazon Associates). Returns ingredients and gear sorted by affiliate score with price range and commission estimate per item. Use for recipe blog monetization, cooking channel affiliate strategy, and shoppable content generation. Accepts ingredient list or recipe_id from extract_recipe_ingredients.",
    {
      recipe_name: z
        .string()
        .min(1)
        .max(RECIPE_NAME_MAX)
        .describe("Recipe name (e.g. 'Beef Bourguignon', 'Chocolate Chip Cookies')"),
      ingredients: z
        .array(
          z.object({
            name: z.string().min(1).max(INGREDIENT_NAME_MAX),
            quantity: z.string().max(INGREDIENT_QUANTITY_MAX).optional(),
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
        .max(ID_MAX_CHARS)
        .optional()
        .describe("Recipe ID from a prior extraction — loads from cache."),
      api_key: z
        .string()
        .max(API_KEY_MAX_CHARS)
        .optional()
        .describe("Optional API key for paid access beyond the free tier"),
    },
    async ({ recipe_name, ingredients: rawIngredients, recipe_id, api_key }) => {
      const start = Date.now();

      const auth = await authorize(env, request, api_key);
      if (!auth.authorized) {
        if (metering)
          ctx.waitUntil(
            metering.record({
              toolName: "_auth_failure",
              paymentMethod: "free_tier",
              processingTimeMs: 0,
              success: false,
            })
          );
        return paymentRequiredResult(auth.reason ?? "Payment required");
      }

      try {
        let ingredients: Ingredient[];

        if (recipe_id) {
          const cached = await cacheGet(env.RECIPE_CACHE, recipe_id);
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

        if (metering)
          ctx.waitUntil(
            metering.record({
              toolName: "suggest_affiliate_products",
              paymentMethod: meteringMethod(auth.method),
              amountUsd: auth.method === "api_key" ? TOOL_PRICE_USD : 0,
              processingTimeMs: Date.now() - start,
              success: true,
            })
          );

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
        if (metering)
          ctx.waitUntil(
            metering.record({
              toolName: "suggest_affiliate_products",
              paymentMethod: meteringMethod(auth.method),
              processingTimeMs: Date.now() - start,
              success: false,
            })
          );
        const message =
          err instanceof OpenAI.APIError
            ? "upstream service temporarily unavailable"
            : err instanceof Error
              ? err.message
              : "internal error";
        return errorResult(`Shopping list generation failed: ${message}`);
      }
    }
  );

  return server;
}

// ============================================================================
// DISCOVERY CONTENT (agent-readable examples + LLM tool docs)
// ============================================================================

const LLMS_TXT = `# recipe-commerce-mcp

MCP server for recipe commerce intelligence. Extracts ingredients from cooking video transcripts and matches them to affiliate products on Amazon, Instacart, Williams-Sonoma, and Thrive Market.

## Tools

### extract_recipe_ingredients
- Input: transcript text or YouTube URL (up to 100,000 chars), optional recipe_id for caching
- Output: {result: {recipeName, ingredients [{name, quantity, unit, category, optional}], equipment [{name, category, requiredForRecipe}], techniques, cuisineType, difficulty}, _meta}
- Typical output: 400-700 tokens (scales with recipe complexity)
- Latency: 2-4 seconds (OpenAI GPT-4o-mini)
- Price: free for first 200 calls/day, $0.001/call with API key
- Supports: YouTube URLs, Substack, plain transcript text

### match_ingredients_to_products
- Input: ingredients array OR recipe_id from prior extraction
- Output: products array [{ingredient, productName, category, affiliateProgram, estimatedPrice {min, max, currency}, commissionRate, affiliateScore, substitutes}], ingredient_count
- Typical output: 800-1500 tokens (scales with ingredient count)
- Latency: <100ms (local computation, no OpenAI call)
- Affiliate programs: amazon_associates, williams_sonoma, thrive_market, instacart

### suggest_affiliate_products
- Input: recipe_name (required), ingredients array OR recipe_id
- Output: {recipeName, products sorted by affiliateScore desc, totalEstimatedCost {min, max}}
- Typical output: 1000-2000 tokens (scales with ingredient count)
- Latency: <100ms (local computation, no OpenAI call)
- Use case: generate a ranked affiliate shopping list for video descriptions and blog posts

## Ingredient Categories
pantry, fresh, dairy, meat, seafood, equipment, specialty, other

## Commission Rates by Category
- equipment: 10% (Williams-Sonoma, Amazon Associates)
- specialty: 7% (Thrive Market)
- pantry/seafood: 4% (Amazon Associates)
- dairy/meat/other: 3%
- fresh: 2% (Instacart)

## Auth
Set MCP_API_KEYS=your-key in your MCP config for paid access. Free tier: 200 calls/day, no key required.`;

function getExamplesResponse() {
  return {
    mcp: "recipe-commerce-mcp",
    version: SERVER_VERSION,
    examples: [
      {
        tool: "extract_recipe_ingredients",
        description: "Extract recipe name, ingredient list (with quantity/unit/category), equipment, and cooking technique tags from a cooking video transcript or YouTube URL. Uses GPT-4o-mini. Results are cached by recipe_id for downstream tools.",
        input: {
          transcript: "Welcome back — today we're making my classic beef bourguignon. You'll need 2 lbs of beef chuck, cut into 2-inch cubes. Then we have a bottle of good Burgundy wine — don't use cooking wine, use something you'd drink. Two tablespoons of tomato paste, a pound of cremini mushrooms, and six slices of thick-cut bacon. For equipment you'll absolutely need a Dutch oven — this is non-negotiable. I'm using my Le Creuset 5.5-quart today...",
          recipe_id: "beef-bourguignon-ep-47",
        },
        output: {
          result: {
            recipeName: "Beef Bourguignon",
            ingredients: [
              { name: "beef chuck", quantity: "2", unit: "lbs", category: "meat", optional: false },
              { name: "Burgundy wine", quantity: "1", unit: "bottle", category: "pantry", optional: false },
              { name: "tomato paste", quantity: "2", unit: "tablespoons", category: "pantry", optional: false },
              { name: "cremini mushrooms", quantity: "1", unit: "lb", category: "fresh", optional: false },
              { name: "thick-cut bacon", quantity: "6", unit: "slices", category: "meat", optional: false },
            ],
            equipment: [
              { name: "Le Creuset Dutch oven 5.5qt", category: "cookware", requiredForRecipe: true },
            ],
            techniques: ["braising", "searing", "deglazing"],
            cuisineType: "French",
            difficulty: "medium",
          },
          _meta: { processing_time_ms: 1950, ai_cost_usd: 0.0024, cache_hit: false, recipe_id: "beef-bourguignon-ep-47" },
        },
        value_narrative: "Le Creuset 5.5qt Dutch oven requiredForRecipe: true — highest-value affiliate opportunity. Retails at $400+. At 10% commission = $40/conversion. Link in description, pin in comments. Burgundy wine: most cooking channels don't monetise wine. Wine.com, Vivino, Naked Wines all have affiliate programs. Run match_ingredients_to_products with this recipe_id to get full affiliate scoring across all ingredients without re-processing.",
        eval: { F1: 0.88, latency_ms: 7054, cost_usd: 0.000370 },
      },
    ],
  };
}

// ============================================================================
// WORKER ENTRY POINT
// ============================================================================

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // Health check
    if (url.pathname === "/health") {
      return new Response(
        JSON.stringify({ status: "ok", name: "recipe-commerce-mcp", version: SERVER_VERSION }),
        { headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
      );
    }

    // Usage dashboard (traction monitoring)
    if (url.pathname === "/usage" && request.method === "GET") {
      if (!env.TELEMETRY) {
        return new Response(JSON.stringify({ error: "TELEMETRY KV not configured" }), {
          status: 503,
          headers: { "Content-Type": "application/json", ...CORS_HEADERS },
        });
      }
      const metering = new CloudflareMetering(env.TELEMETRY);
      const summaries = await Promise.all(TOOL_NAMES.map((t) => metering.getToolSummary(t)));
      return new Response(
        JSON.stringify({ tools: summaries, as_of: new Date().toISOString() }),
        { headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
      );
    }

    // Agent discovery: real-output examples (no auth required)
    if (url.pathname === "/examples" && request.method === "GET") {
      return new Response(JSON.stringify(getExamplesResponse()), {
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      });
    }

    // Agent discovery: LLM-readable tool docs (no auth required)
    if (url.pathname === "/.well-known/llms.txt" && request.method === "GET") {
      return new Response(LLMS_TXT, {
        headers: { "Content-Type": "text/plain; charset=utf-8", ...CORS_HEADERS },
      });
    }

    // MCP Streamable HTTP endpoint (stateless)
    if (url.pathname === "/mcp" || url.pathname === "/") {
      const transport = new WebStandardStreamableHTTPServerTransport({
        sessionIdGenerator: undefined, // stateless — no session tracking required
      });

      const server = createMcpServer(env, request, ctx);
      await server.connect(transport);

      const response = await transport.handleRequest(request);

      // Merge CORS headers into MCP response
      const headers = new Headers(response.headers);
      for (const [k, v] of Object.entries(CORS_HEADERS)) {
        headers.set(k, v);
      }
      return new Response(response.body, { status: response.status, headers });
    }

    return new Response("Not found", { status: 404, headers: CORS_HEADERS });
  },
};
