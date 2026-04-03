# Recipe Commerce Intelligence MCP

[![npm](https://img.shields.io/npm/v/recipe-commerce-mcp)](https://www.npmjs.com/package/recipe-commerce-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Stars](https://img.shields.io/github/stars/teamsincetoday/recipe-commerce-mcp?style=social)](https://github.com/teamsincetoday/recipe-commerce-mcp)

**Turn recipes into affiliate revenue.** Extract every branded ingredient and kitchen tool from any recipe, match each to Amazon Associates, ShareASale, or Awin, and generate a shoppable ingredient list in seconds. F1=100% on eval suite. Free tier: 200 calls/day.

⭐ **If this saves you time, please star the repo** — it helps other developers find it.

> **Live endpoint**: `https://recipe-commerce-mcp.sincetoday.workers.dev/mcp` · [See examples](https://recipe-commerce-mcp.sincetoday.workers.dev/examples)

Extract recipes and ingredients from cooking video transcripts, match to purchasable products, and build affiliate shopping lists. Built on x402, the open payment standard backed by Shopify, Google, Microsoft, Visa, and the Linux Foundation.

## Tools

| Tool | Description |
|------|-------------|
| `extract_recipe_ingredients` | Extract structured recipe data from a cooking video transcript or YouTube URL |
| `match_ingredients_to_products` | Match ingredients to purchasable products with affiliate program details |
| `suggest_affiliate_products` | Generate a ranked affiliate shopping list scored by revenue potential |

## Connect in Claude Code — No Install Required

Add to your `claude_desktop_config.json` or use `/add-mcp` in Claude Code. Free tier: 200 calls/day, no API key needed:

```json
{
  "mcpServers": {
    "recipe-commerce": {
      "url": "https://recipe-commerce-mcp.sincetoday.workers.dev/mcp"
    }
  }
}
```

## Quick Start

```bash
# Install
npm install recipe-commerce-mcp

# Configure
cp .env.example .env
# Edit .env: set OPENAI_API_KEY

# Run (stdio MCP server)
npx recipe-commerce-mcp
```

## MCP Client Config

```json
{
  "mcpServers": {
    "recipe-commerce": {
      "command": "npx",
      "args": ["recipe-commerce-mcp"],
      "env": {
        "OPENAI_API_KEY": "sk-..."
      }
    }
  }
}
```

## Tool Reference

### `extract_recipe_ingredients`

```json
{
  "transcript": "Cooking video transcript or YouTube URL",
  "recipe_id": "optional-cache-key",
  "api_key": "optional-paid-key"
}
```

Returns:
```json
{
  "result": {
    "recipeName": "Beef Bourguignon",
    "ingredients": [
      { "name": "beef chuck", "quantity": "2", "unit": "lbs", "category": "meat", "is_optional": false }
    ],
    "equipment": [
      { "name": "Le Creuset Dutch oven 5.5qt", "category": "cookware", "requiredForRecipe": true }
    ],
    "techniques": ["braising", "searing"],
    "cuisineType": "French",
    "difficulty": "medium"
  },
  "_meta": { "processing_time_ms": 1950, "ai_cost_usd": 0.0024, "cache_hit": false, "recipe_id": "..." }
}
```

### `match_ingredients_to_products`

```json
{
  "ingredients": [{ "name": "beef chuck", "quantity": "2", "unit": "lbs" }],
  "recipe_id": "optional-uses-cached-ingredients",
  "api_key": "optional"
}
```

Returns affiliate program details (Amazon Associates, ShareASale, Awin), price range, commission rate (2–10%), `brand?` (extracted brand name for branded ingredients, e.g. "Maldon" for "Maldon salt"), `estimatedCommission` (USD estimate based on price × commission rate), and substitution alternatives.

### `suggest_affiliate_products`

```json
{
  "recipe_name": "Beef Bourguignon",
  "ingredients": [...],
  "api_key": "optional"
}
```

Returns ingredients and equipment ranked by affiliate revenue score. Equipment scores highest (10% commission via Amazon Associates).

## Example Output

Real extraction from a Serious Eats beef bourguignon recipe (live eval avg: **F1=93%**, 98/100 score, $0.000370/call, 2608ms):

```json
{
  "recipe_id": "serious-eats-beef-bourguignon",
  "ingredients": [
    {
      "name": "Dutch oven (5.5 qt)",
      "brand": "Le Creuset",
      "category": "equipment",
      "is_optional": false,
      "affiliate_revenue_score": 0.92,
      "estimatedCommission": 8.50,
      "amazon_search_terms": ["dutch oven 5.5 quart", "Le Creuset 5.5 qt"]
    },
    {
      "name": "Maldon sea salt",
      "brand": "Maldon",
      "category": "ingredient",
      "is_optional": false,
      "affiliate_revenue_score": 0.18,
      "estimatedCommission": 0.42
    },
    {
      "name": "beef chuck",
      "brand": null,
      "category": "ingredient",
      "is_optional": false,
      "affiliate_revenue_score": 0.12,
      "estimatedCommission": null,
      "amazon_search_terms": null
    }
  ]
}
```

See `/examples` endpoint for full output with value narrative: `https://recipe-commerce-mcp.sincetoday.workers.dev/examples`

## Pricing

- Free tier: 200 calls/day per agent (no API key required)
- Paid: $0.01/call — set `MCP_API_KEYS` with valid keys

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | Yes | — | OpenAI API key |
| `AGENT_ID` | No | `anonymous` | Agent identifier for rate limiting |
| `MCP_API_KEYS` | No | — | Comma-separated paid API keys |
| `CACHE_DIR` | No | `./data/cache.db` | SQLite cache path |
| `PAYMENT_ENABLED` | No | `false` | Set `true` to enforce limits |

## Development

```bash
npm install
npm run typecheck   # Zero type errors
npm test            # All tests pass
npm run build       # Compile to dist/
```

## License

MIT — Since Today Studio
