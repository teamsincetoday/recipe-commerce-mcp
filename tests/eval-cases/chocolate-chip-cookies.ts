/**
 * Eval case: Chocolate Chip Cookies — Baking recipe with equipment density.
 * Source: Representative of NYT Cooking / Serious Eats format (public recipes).
 * Known ingredients: butter, sugar, flour, eggs, chocolate chips, vanilla, baking soda.
 * Tests: pantry/baking categorization; baking equipment extraction (mixer, cookie sheet).
 */

import type { RecipeEvalCase } from "../eval-types.js";

export const chocolateChipCookies: RecipeEvalCase = {
  id: "chocolate-chip-cookies-classic",
  name: "Classic Chocolate Chip Cookies",
  source: "NYT Cooking / Serious Eats — public baking recipe format",
  content: `
The Perfect Chocolate Chip Cookie Recipe

Brown butter makes these the best chocolate chip cookies you've ever had. I've tested this
recipe over 30 times — here's what actually matters.

Ingredients:
- 2 1/4 cups (280g) all-purpose flour (King Arthur or Bob's Red Mill)
- 1 tsp baking soda
- 1 tsp fine sea salt (Diamond Crystal — volume varies by brand)
- 1 cup (225g) unsalted butter, browned and cooled (European-style like Kerrygold is worth it)
- 3/4 cup (150g) granulated sugar
- 3/4 cup (165g) packed light brown sugar
- 2 large eggs + 1 yolk (room temperature matters)
- 2 tsp pure vanilla extract (Nielsen-Massey is my go-to)
- 2 cups (340g) semi-sweet chocolate chips (or chopped Valrhona 64% chocolate)
- Flaky sea salt for topping (Maldon)

Equipment you'll actually need:
- Stand mixer (KitchenAid 5qt) or hand mixer
- Heavy-bottomed saucepan for browning butter
- Kitchen scale (Oxo is reliable at $50)
- Large rimmed baking sheets (Nordic Ware half sheet pans)
- Silicone baking mats (Silpat) — better than parchment for even browning
- Cookie scoop (OXO Good Grips #40) for consistent sizing
- Wire cooling rack

Method:
Brown the butter in a saucepan over medium heat, stirring constantly until it smells nutty
and turns golden amber — about 5-7 minutes. Pour into a large bowl or stand mixer bowl,
let cool 10 minutes.

Whisk flour, baking soda, and salt together. Beat cooled brown butter with both sugars
until combined. Add eggs and yolk one at a time, then vanilla. Fold in flour mixture,
then chocolate chips.

Refrigerate dough 24-72 hours for best flavor development. Scoop into 2-tbsp balls onto
lined baking sheets. Bake at 375°F for 11-13 minutes until edges are golden.
`.trim(),
  expectedRecipeName: "Chocolate Chip Cookies",
  expectedIngredients: [
    { name: "flour", category: "pantry", required: true },
    { name: "butter", category: "dairy", required: true },
    { name: "brown sugar", category: "pantry", required: true },
    { name: "granulated sugar", category: "pantry", required: true },
    { name: "eggs", category: "dairy", required: true },
    { name: "vanilla extract", category: "pantry", required: true },
    { name: "chocolate chips", category: "pantry", required: true },
    { name: "baking soda", category: "pantry", required: true },
    { name: "salt", category: "pantry", required: false },
  ],
  maxTokens: 2000,
};
