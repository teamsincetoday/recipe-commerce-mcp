# Installing recipe-commerce-mcp with Cline

This is a **remote MCP server** running on Cloudflare Workers. No local installation, no npm install, no build step required.

## Quick Setup (Free Tier)

Free tier: **200 calls/day, no API key required.**

Add to your Cline MCP settings (`cline_mcp_settings.json`):

```json
{
  "mcpServers": {
    "recipe-commerce": {
      "url": "https://recipe-commerce-mcp.sincetoday.workers.dev/mcp",
      "type": "streamableHttp",
      "timeout": 60
    }
  }
}
```

Cline → Extensions (⊞) → Remote Servers → paste URL: `https://recipe-commerce-mcp.sincetoday.workers.dev/mcp`

## Paid Tier (optional)

Unlimited calls at $0.01/call. Add `X-API-Key` header with your key:

```json
{
  "mcpServers": {
    "recipe-commerce": {
      "url": "https://recipe-commerce-mcp.sincetoday.workers.dev/mcp",
      "type": "streamableHttp",
      "headers": {
        "X-API-Key": "your-api-key"
      },
      "timeout": 60
    }
  }
}
```

## Available Tools

- **`extract_recipe_ingredients`** — Extract ingredients from recipe content with quantity, unit, and product category classification. Input: recipe text or URL. Output: structured ingredient list with purchasability scores.
- **`match_ingredients_to_products`** — Match extracted ingredients to purchasable products, brand suggestions, and affiliate link slots.
- **`suggest_affiliate_products`** — Suggest monetizable affiliate products for a recipe — kitchen equipment, specialty ingredients, and substitutes with commission potential.

## Verify Connection

After adding the server, ask Cline: *"What tools does recipe-commerce provide?"*

Test with: *"Extract ingredients from this recipe: [paste recipe text]"*

## Specs

- Endpoint: `https://recipe-commerce-mcp.sincetoday.workers.dev/mcp`
- Transport: Streamable HTTP (MCP spec 2025-11-05)
- Auth: None (free tier) or `X-API-Key` header (paid)
- Free tier: 200 calls/day per IP
- Paid tier: $0.01/call (x402 micropayments)
- Tests: 643 passing, F1=100%, OWASP-compliant
- Source: https://github.com/teamsincetoday/recipe-commerce-mcp
