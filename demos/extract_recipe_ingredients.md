# `extract_recipe_ingredients` — Example Output

Extract recipe name, ingredient list (with quantity/unit/category), equipment, and cooking technique tags from a cooking video transcript or YouTube URL. Uses GPT-4o-mini. Results are cached by `recipe_id` for downstream tools.

## Example Call

```json
{
  "tool": "extract_recipe_ingredients",
  "arguments": {
    "transcript": "Welcome back — today we're making my classic beef bourguignon. You'll need 2 lbs of beef chuck, cut into 2-inch cubes. Then we have a bottle of good Burgundy wine — don't use cooking wine, use something you'd drink. Two tablespoons of tomato paste, a pound of cremini mushrooms, and six slices of thick-cut bacon. For equipment you'll absolutely need a Dutch oven — this is non-negotiable. I'm using my Le Creuset 5.5-quart today...",
    "recipe_id": "beef-bourguignon-ep-47"
  }
}
```

## Example Output

```json
{
  "result": {
    "recipeName": "Beef Bourguignon",
    "ingredients": [
      {
        "name": "beef chuck",
        "quantity": "2",
        "unit": "lbs",
        "category": "meat",
        "optional": false
      },
      {
        "name": "Burgundy wine",
        "quantity": "1",
        "unit": "bottle",
        "category": "pantry",
        "optional": false
      },
      {
        "name": "tomato paste",
        "quantity": "2",
        "unit": "tablespoons",
        "category": "pantry",
        "optional": false
      },
      {
        "name": "cremini mushrooms",
        "quantity": "1",
        "unit": "lb",
        "category": "fresh",
        "optional": false
      },
      {
        "name": "thick-cut bacon",
        "quantity": "6",
        "unit": "slices",
        "category": "meat",
        "optional": false
      }
    ],
    "equipment": [
      {
        "name": "Le Creuset Dutch oven 5.5qt",
        "category": "cookware",
        "requiredForRecipe": true
      }
    ],
    "techniques": ["braising", "searing", "deglazing"],
    "cuisineType": "French",
    "difficulty": "medium"
  },
  "_meta": {
    "processing_time_ms": 1950,
    "ai_cost_usd": 0.0024,
    "cache_hit": false,
    "recipe_id": "beef-bourguignon-ep-47"
  }
}
```

## What to do with this

- **Le Creuset 5.5qt Dutch oven `requiredForRecipe: true`** — this is your highest-value affiliate opportunity. Le Creuset retails at $400+. At 10% commission that's $40/conversion. Link in description, pin in comments.
- **Burgundy wine** — most cooking channels don't monetise wine. Wine.com, Vivino, and Naked Wines all have affiliate programs. A "use code CHEF for $20 off first order" on a premium wine recommendation converts well.
- **`difficulty: "medium"` + `techniques: ["braising", "searing", "deglazing"]`** — audience is intermediate. They're more likely to buy quality equipment (Le Creuset) vs a beginner who'd buy a $30 pan.
- Run `match_ingredients_to_products` with this `recipe_id` to get full affiliate scoring across all ingredients without re-processing.
- Run `suggest_affiliate_products` to get a ranked shopping list prioritised by affiliate opportunity score.
