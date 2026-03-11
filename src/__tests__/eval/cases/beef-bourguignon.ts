/**
 * Eval case: Beef Bourguignon — classic French braise.
 *
 * Cooking video transcript style content. 10+ ingredients.
 * Ground truth: 11 ingredients, 2 equipment items.
 *
 * Required ingredients: beef chuck (meat), red wine (pantry),
 *                       pearl onions (fresh), carrots (fresh)
 * Required equipment: Dutch oven
 */

import type { RecipeEvalCase } from "../types.js";

export const BEEF_BOURGUIGNON_TRANSCRIPT = `
Hey everyone, welcome back to the channel. Today we're making Beef Bourguignon,
the classic French braise that Julia Child made famous. This is a weekend project
recipe — it takes about three hours total but most of that is hands-off time in
the oven.

Let's talk about ingredients. You'll need about two and a half pounds of beef
chuck, cut into two-inch cubes. Beef chuck is the right cut here — it has enough
fat and collagen that it becomes incredibly tender after braising. Don't use
leaner cuts like sirloin or they'll dry out.

For aromatics: one large onion, diced; three medium carrots, sliced into coins;
and two stalks of celery, roughly chopped. These build the flavor base.

Now the most important ingredient — the wine. You want a full bottle of red wine,
something like a Burgundy or Côtes du Rhône. Nothing too expensive, but don't use
anything you wouldn't drink. The wine is going to cook down and concentrate, so
the quality really matters here.

We also need two cups of beef broth — homemade is best but store-bought works
fine. A tablespoon of tomato paste for depth. A few sprigs of fresh thyme and
two bay leaves round out the herb situation.

For the pearl onions — you'll want about one pound of fresh pearl onions. You
can use frozen if you're short on time, but fresh gives you better texture. Blanch
them in boiling water for thirty seconds, then shock in ice water and the skins
slip right off.

Finally, eight ounces of mushrooms — cremini or button — halved and sautéed
separately before adding to the braise at the end. And of course, salt and
black pepper to season throughout.

For equipment, the absolute essential here is a Dutch oven. You need something
oven-safe that can go from stovetop to oven — cast iron or enameled cast iron is
ideal. My five-and-a-half quart Le Creuset is what I'm using today. You'll also
want a wooden spoon for stirring so you don't scratch the enamel.

Let's get started. First, pat the beef cubes completely dry with paper towels.
Moisture is the enemy of browning. Season generously with salt and pepper.

Heat your Dutch oven over high heat with a couple tablespoons of neutral oil.
Working in batches — don't crowd the pan — sear the beef until deeply browned on
at least two sides, about three minutes per side. This is the most important step.
The fond that builds up on the bottom is pure flavor.

Set the beef aside. Drop your heat to medium and add the diced onion, carrots,
and celery. Scrape up any browned bits from the bottom as the vegetables soften,
about five minutes.

Stir in the tomato paste and cook for two minutes. Pour in the entire bottle of
red wine and bring to a simmer. Let it reduce by about a third — this takes maybe
ten minutes and burns off most of the raw alcohol.

Add the beef back to the pot with the beef broth, thyme, and bay leaves. The
liquid should come about halfway up the beef. Bring to a gentle boil, then cover
and transfer to a 325°F oven.

Braise for two and a half to three hours until the beef is completely tender —
it should fall apart when you press it with a fork. About thirty minutes before
it's done, add the pearl onions.

While the braise finishes, sauté the mushrooms in butter over high heat until
golden. Season and set aside.

When the beef is done, remove the bay leaves and thyme stems. If the sauce needs
thickening, simmer uncovered on the stovetop for ten to fifteen minutes. Stir in
the mushrooms. Taste and adjust seasoning.

Serve over egg noodles or mashed potatoes with a glass of that Burgundy. This
reheats beautifully — the flavor actually improves on day two.
`;

export const beefBourguignon: RecipeEvalCase = {
  id: "beef-bourguignon",
  name: "Beef Bourguignon — Classic French Braise",
  description:
    "Classic French beef braise transcript. Tests extraction of 11+ ingredients including wine, aromatics, and pearl onions, plus Dutch oven equipment detection.",
  transcript: BEEF_BOURGUIGNON_TRANSCRIPT,
  recipeId: "beef-bourguignon-001",
  expectedIngredients: [
    { name: "beef chuck",     required: true,  category: "meat" },
    { name: "red wine",       required: true,  category: "pantry" },
    { name: "pearl onions",   required: true,  category: "fresh" },
    { name: "carrots",        required: true,  category: "fresh" },
    { name: "onion",          required: false, category: "fresh" },
    { name: "celery",         required: false, category: "fresh" },
    { name: "beef broth",     required: false, category: "pantry" },
    { name: "tomato paste",   required: false, category: "pantry" },
    { name: "thyme",          required: false, category: "fresh" },
    { name: "bay leaves",     required: false, category: "pantry" },
    { name: "mushrooms",      required: false, category: "fresh" },
  ],
  expectedEquipment: [
    { name: "Dutch oven", required: true },
    { name: "wooden spoon", required: false },
  ],
  maxCostUsd: 0.01,
};
