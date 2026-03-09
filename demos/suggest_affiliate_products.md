# `suggest_affiliate_products` — Example Output

Build a ranked affiliate shopping list for a recipe, scoring each ingredient by revenue potential. Uses local scoring (no extra API call). Equipment, specialty items, and premium pantry goods rank highest. Sorted by `affiliateScore` descending so your highest-value links are first.

## Example Call

```json
{
  "tool": "suggest_affiliate_products",
  "arguments": {
    "recipe_name": "Beef Bourguignon",
    "recipe_id": "beef-bourguignon-ep-47"
  }
}
```

*Uses cached extraction from a prior `extract_recipe_ingredients` call. Loads from cache — 0 AI cost.*

## Example Output

```json
{
  "recipeName": "Beef Bourguignon",
  "products": [
    {
      "ingredient": "beef chuck",
      "productName": "Beef Chuck",
      "category": "meat",
      "affiliateProgram": "instacart",
      "estimatedPrice": { "min": 8, "max": 40, "currency": "USD" },
      "commissionRate": 0.03,
      "affiliateScore": 0.04,
      "substitutes": ["plant-based protein alternative"]
    },
    {
      "ingredient": "thick-cut bacon",
      "productName": "Thick-Cut Bacon",
      "category": "meat",
      "affiliateProgram": "instacart",
      "estimatedPrice": { "min": 8, "max": 40, "currency": "USD" },
      "commissionRate": 0.03,
      "affiliateScore": 0.04,
      "substitutes": ["plant-based protein alternative"]
    },
    {
      "ingredient": "Burgundy wine",
      "productName": "Burgundy Wine",
      "category": "pantry",
      "affiliateProgram": "amazon_associates",
      "estimatedPrice": { "min": 2, "max": 15, "currency": "USD" },
      "commissionRate": 0.04,
      "affiliateScore": 0.02,
      "substitutes": []
    },
    {
      "ingredient": "tomato paste",
      "productName": "Tomato Paste",
      "category": "pantry",
      "affiliateProgram": "amazon_associates",
      "estimatedPrice": { "min": 2, "max": 15, "currency": "USD" },
      "commissionRate": 0.04,
      "affiliateScore": 0.02,
      "substitutes": []
    },
    {
      "ingredient": "cremini mushrooms",
      "productName": "Cremini Mushrooms",
      "category": "fresh",
      "affiliateProgram": "instacart",
      "estimatedPrice": { "min": 1, "max": 8, "currency": "USD" },
      "commissionRate": 0.02,
      "affiliateScore": 0.00,
      "substitutes": ["frozen equivalent", "canned equivalent"]
    }
  ],
  "totalEstimatedCost": { "min": 21, "max": 118 },
  "_meta": {
    "processing_time_ms": 12,
    "ai_cost_usd": 0,
    "cache_hit": true
  }
}
```

## What to do with this

- **Top link: Instacart meat delivery** — beef chuck and thick-cut bacon both rank at the top. `affiliateScore: 0.04` reflects 3% commission on $8–40 basket items. Set up an Instacart affiliate link in your video description and pin it. On a recipe channel with 50k views, even 0.1% click-to-purchase converts to ~$6–12/video.

- **Wine monetisation is the gap** — Burgundy wine is sitting at `affiliateProgram: "amazon_associates"` but premium wine deserves better. Wine.com (8% commission), Vivino, or Naked Wines all pay more on a $25 bottle. If you manually pass wine as `category: "specialty"` the score bumps to 0.09 and the program switches to Thrive Market — or use `match_ingredients_to_products` to inspect and edit before generating the shopping list.

- **Equipment is the real prize** — the Dutch oven from `extract_recipe_ingredients` is stored in `equipment[]`, separate from `ingredients[]`. To include it in this shopping list, pass it explicitly with `category: "equipment"`. Le Creuset at $400 × 10% commission = $40/conversion. That's 5× the value of the meat links. Don't skip it.

- **`ai_cost_usd: 0`** — this tool runs entirely local scoring. You can call it repeatedly (for different affiliate program comparisons, for variant recipes) at zero marginal cost after the initial extraction.

- **Pipe to content tools** — sorted `products[]` is ready to paste into a "Shop This Recipe" description template, a Beacons.ai link page, or a Notion shopping list database for your newsletter segment.
