# Recipe Commerce Intelligence MCP

Extract recipes and ingredients from cooking video transcripts, match to purchasable products, and build affiliate shopping lists. Built for the agent-to-agent economy.

## Tools

| Tool | Description |
|------|-------------|
| `extract_recipe_ingredients` | Extract structured recipe data from a cooking video transcript or YouTube URL |
| `match_ingredients_to_products` | Match ingredients to purchasable products with affiliate program details |
| `suggest_affiliate_products` | Generate a ranked affiliate shopping list scored by revenue potential |

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
      { "name": "beef chuck", "quantity": "2", "unit": "lbs", "category": "meat", "optional": false }
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

Returns affiliate program details (Amazon Associates, ShareASale, Awin), price range, commission rate (2–10%), and substitution alternatives.

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

Real extraction from a Serious Eats beef bourguignon recipe (eval score: **F1=0.88**, $0.000370/call, 7054ms):

```json
{
  "recipe_id": "serious-eats-beef-bourguignon",
  "ingredients": [
    {
      "name": "Dutch oven (5.5 qt)",
      "category": "equipment",
      "affiliate_revenue_score": 0.92,
      "amazon_search_terms": ["dutch oven 5.5 quart", "Le Creuset 5.5 qt"],
      "estimated_commission_usd": 8.50
    },
    {
      "name": "beef chuck",
      "category": "ingredient",
      "affiliate_revenue_score": 0.12,
      "amazon_search_terms": null,
      "estimated_commission_usd": null
    }
  ]
}
```

See `/examples` endpoint for full output with value narrative: `https://recipe-commerce-mcp.sincetoday.workers.dev/examples`

## Pricing

- Free tier: 200 calls/day per agent (no API key required)
- Paid: $0.001/call — set `MCP_API_KEYS` with valid keys

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
