# `match_ingredients_to_products` — Example Output

Match a list of ingredients to purchasable products with affiliate program details, price ranges, commission rates, and substitution alternatives. Accepts ingredient list directly or a `recipe_id` from a previous extraction.

## Example Call

```json
{
  "tool": "match_ingredients_to_products",
  "arguments": {
    "recipe_id": "beef-bourguignon-ep-47"
  }
}
```

## Example Output

```json
{
  "ingredient": "beef chuck",
  "results": [
    {
      "ingredient": "beef chuck",
      "productName": "USDA Prime Beef Chuck Roast",
      "brand": "Snake River Farms",
      "category": "meat",
      "affiliateProgram": "other",
      "estimatedPrice": { "min": 28, "max": 55, "currency": "USD" },
      "commissionRate": 0.06,
      "affiliateScore": 72,
      "substitutes": ["lamb shoulder", "pork shoulder"]
    },
    {
      "ingredient": "Le Creuset Dutch oven 5.5qt",
      "productName": "Le Creuset Enameled Cast Iron Dutch Oven 5.5 Qt",
      "brand": "Le Creuset",
      "category": "equipment",
      "affiliateProgram": "amazon_associates",
      "estimatedPrice": { "min": 380, "max": 420, "currency": "USD" },
      "commissionRate": 0.10,
      "affiliateScore": 98,
      "substitutes": ["Staub Cocotte 5.5qt", "Lodge Enameled Cast Iron 6qt"]
    },
    {
      "ingredient": "cremini mushrooms",
      "productName": "Organic Cremini Mushrooms",
      "brand": null,
      "category": "fresh",
      "affiliateProgram": "instacart",
      "estimatedPrice": { "min": 4, "max": 7, "currency": "USD" },
      "commissionRate": 0.02,
      "affiliateScore": 18,
      "substitutes": ["button mushrooms", "portobello mushrooms"]
    },
    {
      "ingredient": "Burgundy wine",
      "productName": "Pinot Noir (Burgundy-style)",
      "brand": "Meiomi",
      "category": "pantry",
      "affiliateProgram": "other",
      "estimatedPrice": { "min": 14, "max": 35, "currency": "USD" },
      "commissionRate": 0.05,
      "affiliateScore": 64,
      "substitutes": ["Côtes du Rhône", "any dry red wine"]
    }
  ]
}
```

## What to do with this

- **Le Creuset `affiliateScore: 98`** — highest in the set by far. $400 price × 10% commission = $40/conversion. This is your lead affiliate link. Put it first in the description.
- **`substitutes: ["Staub Cocotte", "Lodge"]`** — offer the full range of options to capture buyers at every price point. Lodge Enameled Cast Iron is ~$80. Some audience members won't buy Le Creuset but will buy Lodge. Both earn commissions.
- **Cremini mushrooms `affiliateScore: 18`** — low value. At $5 average price × 2% commission = $0.10/conversion. Instacart links are worth including for convenience (basket-building), but don't lead with them.
- **Wine `affiliateScore: 64`** — mid-tier but often overlooked. Wine affiliate programs exist (Wine.com, Vivino) and a specific wine recommendation in a recipe context converts better than generic wine content.
- Sort links in your video description by `affiliateScore` descending — highest opportunity at the top, where most people click.
