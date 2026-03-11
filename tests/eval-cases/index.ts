import type { RecipeEvalCase } from "../eval-types.js";
import { pastaCarbonara } from "./pasta-carbonara.js";
import { chocolateChipCookies } from "./chocolate-chip-cookies.js";
import { japaneseChickenKaraage } from "./japanese-chicken-karaage.js";

export const ALL_CASES: RecipeEvalCase[] = [
  pastaCarbonara,
  chocolateChipCookies,
  japaneseChickenKaraage,
];
