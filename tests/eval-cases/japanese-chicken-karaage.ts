/**
 * Eval case: Japanese Chicken Karaage — Specialty ingredients with affiliate potential.
 * Source: Representative of Serious Eats / Just One Cookbook format (public recipes).
 * Known ingredients: chicken thighs, soy sauce, sake, mirin, ginger, potato starch, oil.
 * Tests: specialty/Japanese ingredient categorization; high-value affiliate opportunities.
 */

import type { RecipeEvalCase } from "../eval-types.js";

export const japaneseChickenKaraage: RecipeEvalCase = {
  id: "japanese-chicken-karaage",
  name: "Japanese Chicken Karaage",
  source: "Serious Eats / Just One Cookbook — public Japanese recipe format",
  content: `
Japanese Chicken Karaage (唐揚げ) — The Crispiest Version

Karaage is the gold standard for Japanese fried chicken. The double-fry technique and potato
starch coating give you a shell that stays crispy for hours. This is adapted from Nami's
technique at Just One Cookbook and Kenji's Serious Eats version.

Ingredients (serves 4):
- 700g bone-in chicken thighs, skin-on (or boneless skin-on)
- 3 tbsp soy sauce (Japanese Kikkoman or Yamasa — not Chinese soy)
- 2 tbsp sake (cooking sake or Ozeki dry sake)
- 1 tbsp mirin (Kikkoman or Hon-Mirin — not "mirin-style" seasoning)
- 1 tbsp fresh ginger, grated (microplane works perfectly here)
- 2 cloves garlic, grated
- 1 tsp sesame oil (Kadoya is the standard)
- 1/2 cup potato starch (Kato or Bob's Red Mill — NOT cornstarch)
- Neutral oil for frying (rice bran oil or refined avocado oil)
- Kewpie mayonnaise for serving (this is non-negotiable)
- Lemon wedges

Equipment:
- Wok or heavy Dutch oven (Lodge 6qt for consistent oil temp)
- Instant-read thermometer (Thermapen is worth every dollar)
- Spider strainer for frying
- Wire rack over rimmed baking sheet for draining
- Microplane grater for ginger/garlic

Method:
Cut chicken into 4cm pieces. Mix soy sauce, sake, mirin, ginger, garlic, and sesame oil.
Marinate chicken 30 minutes minimum, 2 hours preferred. Pat dry (critical for crispiness).

Toss chicken in potato starch until completely coated. Let sit 5 minutes — starch will
absorb moisture and form a paste.

Heat oil to 160°C (325°F). First fry: cook in batches 4-5 minutes until cooked through
but pale. Drain on rack. Rest 3 minutes.

Second fry: heat oil to 180°C (350°F). Refry in batches 90 seconds until deep golden and
shatteringly crisp. Drain and serve immediately with Kewpie mayo and lemon.
`.trim(),
  expectedRecipeName: "Karaage",
  expectedIngredients: [
    { name: "chicken thighs", category: "meat", required: true },
    { name: "soy sauce", category: "pantry", required: true },
    { name: "sake", category: "pantry", required: true },
    { name: "mirin", category: "pantry", required: true },
    { name: "ginger", category: "produce", required: true },
    { name: "garlic", category: "produce", required: true },
    { name: "potato starch", category: "pantry", required: true },
    { name: "sesame oil", category: "pantry", required: false },
    { name: "Kewpie", category: "pantry", required: false },
  ],
  maxTokens: 2000,
};
