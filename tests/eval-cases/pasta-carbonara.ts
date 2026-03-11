/**
 * Eval case: Classic Pasta Carbonara — Italian pasta dish with pantry staples.
 * Source: Representative of NYT Cooking / Serious Eats format (public recipes).
 * Known ingredients: guanciale/pancetta, eggs, Pecorino Romano, Parmesan, black pepper, pasta.
 * Tests: dairy, meat, pantry categorization; equipment extraction; traditional Italian dish.
 */

import type { RecipeEvalCase } from "../eval-types.js";

export const pastaCarbonara: RecipeEvalCase = {
  id: "pasta-carbonara-classic",
  name: "Classic Pasta Carbonara",
  source: "NYT Cooking / Serious Eats — public recipe format",
  content: `
Classic Pasta Carbonara Recipe

Today I'm making authentic pasta carbonara — no cream, no shortcuts. This is the real Roman
technique using just four ingredients: pasta, guanciale, eggs, and cheese.

You'll need:
- 400g spaghetti or rigatoni (I prefer rigatoni for this)
- 200g guanciale (cured pork cheek) — pancetta works as a substitute
- 4 large eggs (2 whole eggs + 2 yolks — this gives you richness without the scramble)
- 80g Pecorino Romano, finely grated — essential, don't substitute
- 40g Parmigiano Reggiano, finely grated
- Freshly cracked black pepper — generous, this is KEY
- Kosher salt for pasta water (the pasta water is your secret weapon here)

Equipment:
- Large pot for boiling pasta
- 12-inch skillet or cast iron pan
- Large mixing bowl (heat-safe)
- Box grater or Microplane for the cheese
- Tongs for pasta

Method:
Bring a large pot of heavily salted water to a boil. While it heats, slice the guanciale
into lardons about 1cm thick. Render the guanciale in a skillet over medium heat until
crispy and the fat has released — about 8-10 minutes. Remove from heat.

In a mixing bowl, whisk together the eggs, most of the Pecorino Romano, half the Parmesan,
and a generous amount of black pepper. This is your sauce.

Cook the pasta al dente — save 2 cups of pasta water before draining. Add the hot pasta
to the skillet with the guanciale (off heat). Add the egg mixture and toss vigorously,
adding pasta water a splash at a time until you have a creamy, emulsified sauce.

Serve immediately topped with remaining cheese and more black pepper.
`.trim(),
  expectedRecipeName: "Carbonara",
  expectedIngredients: [
    { name: "spaghetti", category: "pantry", required: false },
    { name: "rigatoni", category: "pantry", required: false },
    { name: "guanciale", category: "meat", required: true },
    { name: "pancetta", category: "meat", required: false },
    { name: "eggs", category: "dairy", required: true },
    { name: "Pecorino Romano", category: "dairy", required: true },
    { name: "Parmigiano Reggiano", category: "dairy", required: true },
    { name: "black pepper", category: "pantry", required: true },
    { name: "salt", category: "pantry", required: false },
  ],
  maxTokens: 2000,
};
