/**
 * Eval case: Chocolate Layer Cake — baking recipe.
 *
 * Baking video transcript style content. 8+ ingredients.
 * Ground truth: 8 core ingredients, 3 equipment items.
 *
 * Required ingredients: all-purpose flour (pantry), cocoa powder (pantry),
 *                       buttermilk (dairy), eggs (dairy)
 * Required equipment: 9-inch cake pan
 */

import type { RecipeEvalCase } from "../types.js";

export const CHOCOLATE_LAYER_CAKE_TRANSCRIPT = `
Welcome back. Today we are baking my go-to chocolate layer cake — the recipe
I make for every birthday in my family. It is genuinely foolproof as long as you
measure your ingredients properly and don't over-mix the batter.

Let's go through what you need. For the cake layers, you'll need two cups of
all-purpose flour. Measure it the right way — spoon it into the measuring cup
and level off with a knife. Don't scoop directly from the bag or you'll pack it
in and end up with a dense cake.

Three-quarters of a cup of Dutch-process cocoa powder. The Dutch-process
variety gives you a deeper, darker chocolate flavor compared to natural cocoa.
I strongly recommend it here.

Two cups of granulated sugar and one teaspoon of baking soda. One teaspoon
of fine salt — salt in baking is not optional, it balances the sweetness and
amplifies the chocolate.

For the wet ingredients: two large eggs at room temperature. Room temperature
eggs incorporate more smoothly into the batter. One cup of buttermilk — the
acidity in buttermilk reacts with the baking soda to help the cake rise and
also keeps it incredibly moist. If you don't have buttermilk, you can make a
substitute with regular milk and a tablespoon of white vinegar, but real
buttermilk is worth seeking out.

Half a cup of unsalted butter, melted and cooled slightly. And two teaspoons of
pure vanilla extract — please use real vanilla, not the imitation stuff.

One cup of hot coffee. I know this sounds unusual, but the coffee doesn't make
the cake taste like coffee. It intensifies the chocolate flavor dramatically.
Hot water works as a substitute, but coffee is better.

For equipment, you absolutely need two nine-inch round cake pans. Both layers
need to bake at the same time so they rise evenly. I use light-colored aluminum
pans — dark pans can cause the edges to overbake before the center sets.

A stand mixer makes the job easier, but a hand mixer works perfectly well too.
A cooling rack is essential — you need to let the cakes cool completely before
frosting or the frosting will melt and slide off.

Now let's get into it. Preheat your oven to 350°F. Grease and flour both cake
pans, or use parchment circles on the bottom. I prefer parchment — it guarantees
the cake releases cleanly every time.

In a large bowl, whisk together the dry ingredients: flour, cocoa, sugar, baking
soda, and salt. This is important — get them thoroughly combined before adding
any wet ingredients.

In the stand mixer bowl, beat the eggs briefly. Add the buttermilk, melted
butter, and vanilla and mix on low until combined. With the mixer running on low,
add the dry ingredients in three additions, alternating with the hot coffee.
Start and end with dry. Mix only until just combined — stop when you can't see
any dry streaks. Overmixing develops gluten and makes the cake tough.

Divide the batter evenly between the two prepared pans. A kitchen scale is
helpful here for perfectly even layers. Bake for 30 to 35 minutes until a
toothpick inserted in the center comes out with just a few moist crumbs.

Cool in the pans for 10 minutes, then invert onto the cooling rack. Let them
cool completely — at least an hour — before frosting. If you try to frost a
warm cake, you'll have a disaster on your hands.

For frosting, I use a classic chocolate buttercream: butter, cocoa, powdered
sugar, heavy cream, and vanilla. But honestly that's a whole separate video.
`;

export const chocolateLayerCake: RecipeEvalCase = {
  id: "chocolate-layer-cake",
  name: "Chocolate Layer Cake — Baking Recipe",
  description:
    "Classic chocolate layer cake baking transcript. Tests extraction of 8+ baking ingredients including buttermilk and cocoa powder, plus cake pan equipment detection.",
  transcript: CHOCOLATE_LAYER_CAKE_TRANSCRIPT,
  recipeId: "chocolate-layer-cake-001",
  expectedIngredients: [
    { name: "all-purpose flour", required: true,  category: "pantry" },
    { name: "cocoa powder",      required: true,  category: "pantry" },
    { name: "buttermilk",        required: true,  category: "dairy" },
    { name: "eggs",              required: true,  category: "dairy" },
    { name: "sugar",             required: false, category: "pantry" },
    { name: "baking soda",       required: false, category: "pantry" },
    { name: "butter",            required: false, category: "dairy" },
    { name: "vanilla extract",   required: false, category: "pantry" },
  ],
  expectedEquipment: [
    { name: "cake pan",       required: true },   // "9-inch" variant fails substring match; "cake pan" is the invariant
    { name: "stand mixer",    required: false },
    { name: "cooling rack",   required: false },
  ],
  maxCostUsd: 0.01,
};
