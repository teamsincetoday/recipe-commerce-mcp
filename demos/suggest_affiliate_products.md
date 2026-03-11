# `suggest_affiliate_products` — Example Output

Generate a ranked affiliate shopping list for any recipe, sorted by revenue potential. Equipment always scores highest (10% commission). Fresh produce scores lowest but adds basket value. One call gives you a ready-to-publish affiliate section.

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

Or without a cached extraction:

```json
{
  "tool": "suggest_affiliate_products",
  "arguments": {
    "recipe_name": "Chocolate Chip Cookies",
    "ingredients": [
      {"name": "stand mixer", "category": "equipment", "optional": false},
      {"name": "butter", "category": "dairy", "optional": false},
      {"name": "all-purpose flour", "category": "pantry", "optional": false},
      {"name": "chocolate chips", "category": "pantry", "optional": false},
      {"name": "eggs", "category": "fresh", "optional": false},
      {"name": "vanilla extract", "category": "specialty", "optional": false}
    ]
  }
}
```

## Example Output

```json
{
  "recipeName": "Chocolate Chip Cookies",
  "products": [
    {
      "ingredient": "stand mixer",
      "productName": "Stand Mixer",
      "category": "equipment",
      "affiliateProgram": "williams_sonoma",
      "estimatedPrice": {"min": 25, "max": 200, "currency": "USD"},
      "commissionRate": 0.10,
      "affiliateScore": 0.56,
      "substitutes": []
    },
    {
      "ingredient": "vanilla extract",
      "productName": "Vanilla Extract",
      "category": "specialty",
      "affiliateProgram": "thrive_market",
      "estimatedPrice": {"min": 8, "max": 45, "currency": "USD"},
      "commissionRate": 0.07,
      "affiliateScore": 0.19,
      "substitutes": []
    },
    {
      "ingredient": "all-purpose flour",
      "productName": "All-purpose Flour",
      "category": "pantry",
      "affiliateProgram": "amazon_associates",
      "estimatedPrice": {"min": 2, "max": 15, "currency": "USD"},
      "commissionRate": 0.04,
      "affiliateScore": 0.07,
      "substitutes": ["bread flour", "gluten-free flour blend", "almond flour"]
    },
    {
      "ingredient": "chocolate chips",
      "productName": "Chocolate Chips",
      "category": "pantry",
      "affiliateProgram": "amazon_associates",
      "estimatedPrice": {"min": 2, "max": 15, "currency": "USD"},
      "commissionRate": 0.04,
      "affiliateScore": 0.07,
      "substitutes": []
    },
    {
      "ingredient": "butter",
      "productName": "Butter",
      "category": "dairy",
      "affiliateProgram": "instacart",
      "estimatedPrice": {"min": 3, "max": 12, "currency": "USD"},
      "commissionRate": 0.03,
      "affiliateScore": 0.04,
      "substitutes": ["margarine", "coconut oil", "olive oil"]
    },
    {
      "ingredient": "eggs",
      "productName": "Eggs",
      "category": "fresh",
      "affiliateProgram": "instacart",
      "estimatedPrice": {"min": 1, "max": 8, "currency": "USD"},
      "commissionRate": 0.02,
      "affiliateScore": 0.01,
      "substitutes": ["flax egg", "chia egg", "applesauce"]
    }
  ],
  "totalEstimatedCost": {
    "min": 41,
    "max": 295
  },
  "_meta": {
    "processing_time_ms": 12,
    "ai_cost_usd": 0,
    "cache_hit": false
  }
}
```

## What to do with this

- **`affiliateScore: 0.56` on stand mixer** — Equipment is always your lead affiliate link. A KitchenAid stand mixer at $400+ through Williams-Sonoma at 10% commission = $40/conversion. Lead with this in your video description.
- **Products already sorted** — response is sorted by `affiliateScore` descending. Top-to-bottom = the order to list links in your description.
- **`substitutes` on butter and flour** — Offer the gluten-free flour alternative to capture dietary-restriction viewers. Both Amazon Associates links; you earn either way.
- **Instacart basket** — Dairy and fresh items have low individual commission ($0.10-0.20/item) but Instacart pays on the full basket. Group them into a single Instacart list for better conversion.
- **`totalEstimatedCost: $41–$295`** — The range is wide because of equipment. For viewers who already own a stand mixer, the basket is $16–$95. Mention both in your description: "Shop ingredients ($16+) or the full setup ($295)."

## Free tier

200 calls/day without an API key. This tool uses cached data from `extract_recipe_ingredients` — no extra OpenAI cost when called with a `recipe_id`.
