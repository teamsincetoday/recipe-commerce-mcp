#!/usr/bin/env node

/**
 * CLI entry point for the Recipe Commerce Intelligence MCP Server.
 *
 * Usage:
 *   npx recipe-commerce-mcp          # Start MCP server (stdio transport)
 *   npx recipe-commerce-mcp --help   # Show help
 *   npx recipe-commerce-mcp --version
 *
 * Environment Variables:
 *   OPENAI_API_KEY     Required. OpenAI API key for recipe extraction.
 *   AGENT_ID           Optional. Agent identifier for free tier tracking.
 *   MCP_API_KEYS       Optional. Comma-separated API keys for paid access.
 *   CACHE_DIR          Optional. SQLite file location (default: ./data/cache.db).
 *   PAYMENT_ENABLED    Optional. Set to "true" to enforce payment limits.
 */

import { startStdioServer } from "./server.js";
import { FREE_TIER_DAILY_LIMIT } from "./cache.js";

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  process.stdout.write(`
Recipe Commerce Intelligence MCP Server v0.1.0

Usage:
  npx recipe-commerce-mcp          Start MCP server (stdio transport)
  npx recipe-commerce-mcp --help   Show this help message
  npx recipe-commerce-mcp --version Show version

Environment Variables:
  OPENAI_API_KEY     Required. OpenAI API key for recipe extraction.
  AGENT_ID           Optional. Agent identifier for free tier tracking.
  MCP_API_KEYS       Optional. Comma-separated API keys for paid access.
  CACHE_DIR          Optional. Path to SQLite cache file (default: ./data/cache.db).
  PAYMENT_ENABLED    Optional. Set to "true" to enforce payment/rate limits.

Tools (3 total):
  extract_recipe_ingredients     Extract recipe, ingredients, and equipment from a transcript
  match_ingredients_to_products  Match ingredients to purchasable products with affiliate data
  suggest_affiliate_products     Ranked shopping list sorted by affiliate opportunity score

Pricing:
  Free tier: ${FREE_TIER_DAILY_LIMIT} extractions/day per agent
  Paid: $0.001/call with MCP_API_KEYS

Documentation:
  https://github.com/since-today/recipe-commerce-mcp
\n`);
  process.exit(0);
}

if (args.includes("--version") || args.includes("-v")) {
  process.stdout.write("0.1.0\n");
  process.exit(0);
}

startStdioServer().catch((error: unknown) => {
  console.error("Failed to start Recipe Commerce MCP server:", error);
  process.exit(1);
});
