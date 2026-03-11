/**
 * Eval case: Pasta Carbonara — Italian classic.
 *
 * Cooking video transcript style content.
 * Ground truth: 5 core ingredients, 2 equipment items.
 *
 * Required ingredients: spaghetti (pantry), guanciale/pancetta (meat),
 *                       eggs (dairy), Pecorino Romano (dairy)
 * Required equipment: large pot
 */

import type { RecipeEvalCase } from "../types.js";

export const PASTA_CARBONARA_TRANSCRIPT = `
Ciao, welcome back to the channel. Today I'm showing you how to make real
Pasta Carbonara — the Roman version, not the cream version. There is no cream
in carbonara. If someone puts cream in carbonara, they are making something
else. Something wrong.

Five ingredients. That's all this dish needs. Let me walk you through them.

First, the pasta. Spaghetti is traditional and it's what we're using today.
The thin noodles pick up the sauce beautifully. Rigatoni is an acceptable
alternative if you prefer tube pasta.

Second and most important: guanciale. Guanciale is cured pork cheek, and it
has a richness and flavor that pancetta can't fully replicate. That said, if
you cannot find guanciale, pancetta is the acceptable substitute. Absolutely
do not use bacon — the smokiness will overwhelm everything else. We want
about 150 grams, cut into small lardons.

Third: eggs. We are using the whole egg plus extra yolks. One whole egg plus
three egg yolks per two servings. The extra yolks are what make carbonara
rich and glossy instead of scrambled.

Fourth: Pecorino Romano, freshly grated. You can use Parmigiano-Reggiano or
a mix of the two, but Pecorino is more traditional and has a sharper, saltier
punch that this dish needs. Use a microplane or fine grater — we want it very
fine so it melts into the sauce smoothly.

Fifth: coarsely ground black pepper. A lot of it. Carbonara should be peppery.
Toasting the pepper briefly in the pan before adding the guanciale blooms
the flavor beautifully.

For equipment, you need a large pot for boiling the pasta — this is
non-negotiable. You need enough water so the pasta has room to move. Salt
the water aggressively; it should taste like the sea. You also need a large
skillet for the guanciale — something wide enough that you can toss the pasta
in it comfortably.

Now, technique. This is where carbonara goes wrong for most people.

Get your large pot of salted water boiling. Cook the spaghetti until one
or two minutes before al dente — you will finish cooking it in the pan.

While the pasta cooks, put your guanciale in a cold skillet and bring it
up to medium heat. Rendering slowly from cold extracts more fat and gives
you crispier, more flavorful pieces. Cook until the fat has rendered and
the guanciale is golden but not hard.

Turn off the heat under the skillet. This is critical. You are about to
add the eggs and if the pan is too hot you will scramble them.

In a bowl, whisk together the eggs and yolks, most of the Pecorino, and a
generous amount of black pepper. It should be a thick, pale yellow paste.

Lift the pasta directly from the water with tongs into the skillet — do not
drain it over the sink. The pasta water clinging to the noodles, plus a
generous ladle of pasta cooking water added to the bowl, is what gives you
sauce consistency.

Add the pasta to the skillet. Toss to coat in the guanciale fat. Take the
pan completely off any heat source. Pour the egg and cheese mixture over
the pasta and toss vigorously and continuously. If it looks too thick, add
more pasta water a splash at a time.

You want a silky, glossy sauce that coats every strand. If you see curds,
the pan was too hot. Eat immediately — carbonara does not wait.
`;

export const pastaCarbonara: RecipeEvalCase = {
  id: "pasta-carbonara",
  name: "Pasta Carbonara — Roman Classic",
  description:
    "Authentic Roman carbonara transcript. Tests extraction of 5 classic Italian ingredients and large pot equipment detection.",
  transcript: PASTA_CARBONARA_TRANSCRIPT,
  recipeId: "pasta-carbonara-001",
  expectedIngredients: [
    { name: "spaghetti",       required: true,  category: "pantry" },
    { name: "guanciale",       required: true,  category: "meat" },
    { name: "eggs",            required: true,  category: "dairy" },
    { name: "Pecorino Romano", required: true,  category: "dairy" },
    { name: "black pepper",    required: false, category: "pantry" },
  ],
  expectedEquipment: [
    { name: "large pot",  required: true },
    { name: "skillet",    required: false },
  ],
  maxCostUsd: 0.01,
};
