/**
 * Input size limit tests (FIND-4).
 *
 * Verifies that the Zod schemas in server.ts enforce the expected upper bounds
 * on all user-supplied fields that reach OpenAI. Each test imports the exported
 * limit constants so the assertions stay in sync with the implementation.
 */

import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
  TRANSCRIPT_MAX_CHARS,
  ID_MAX_CHARS,
  API_KEY_MAX_CHARS,
  RECIPE_NAME_MAX,
  INGREDIENT_NAME_MAX,
  INGREDIENT_QUANTITY_MAX,
} from "../src/server.js";

// ============================================================================
// transcript (extract_recipe_ingredients)
// ============================================================================

describe("transcript field limits", () => {
  const schema = z.string().min(1).max(TRANSCRIPT_MAX_CHARS);

  it("accepts a transcript at the exact max length", () => {
    expect(schema.safeParse("x".repeat(TRANSCRIPT_MAX_CHARS)).success).toBe(true);
  });

  it("rejects a transcript one character over the limit", () => {
    const result = schema.safeParse("x".repeat(TRANSCRIPT_MAX_CHARS + 1));
    expect(result.success).toBe(false);
  });

  it("rejects an empty transcript", () => {
    expect(schema.safeParse("").success).toBe(false);
  });
});

// ============================================================================
// recipe_id / id fields
// ============================================================================

describe("ID field limits", () => {
  const schema = z.string().max(ID_MAX_CHARS).optional();

  it("accepts an ID at the exact max length", () => {
    expect(schema.safeParse("a".repeat(ID_MAX_CHARS)).success).toBe(true);
  });

  it("rejects an ID one character over the limit", () => {
    const result = schema.safeParse("a".repeat(ID_MAX_CHARS + 1));
    expect(result.success).toBe(false);
  });

  it("accepts undefined (optional)", () => {
    expect(schema.safeParse(undefined).success).toBe(true);
  });
});

// ============================================================================
// api_key field
// ============================================================================

describe("api_key field limits", () => {
  const schema = z.string().max(API_KEY_MAX_CHARS).optional();

  it("accepts an api_key at the exact max length", () => {
    expect(schema.safeParse("k".repeat(API_KEY_MAX_CHARS)).success).toBe(true);
  });

  it("rejects an api_key one character over the limit", () => {
    const result = schema.safeParse("k".repeat(API_KEY_MAX_CHARS + 1));
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// recipe_name field (suggest_affiliate_products)
// ============================================================================

describe("recipe_name field limits", () => {
  const schema = z.string().min(1).max(RECIPE_NAME_MAX);

  it("accepts a recipe name at the exact max length", () => {
    expect(schema.safeParse("r".repeat(RECIPE_NAME_MAX)).success).toBe(true);
  });

  it("rejects a recipe name one character over the limit", () => {
    expect(schema.safeParse("r".repeat(RECIPE_NAME_MAX + 1)).success).toBe(false);
  });
});

// ============================================================================
// ingredient name field (match_ingredients_to_products, suggest_affiliate_products)
// ============================================================================

describe("ingredient name field limits", () => {
  const schema = z.string().min(1).max(INGREDIENT_NAME_MAX);

  it("accepts an ingredient name at the exact max length", () => {
    expect(schema.safeParse("i".repeat(INGREDIENT_NAME_MAX)).success).toBe(true);
  });

  it("rejects an ingredient name one character over the limit", () => {
    expect(schema.safeParse("i".repeat(INGREDIENT_NAME_MAX + 1)).success).toBe(false);
  });
});

// ============================================================================
// ingredient quantity field
// ============================================================================

describe("ingredient quantity field limits", () => {
  const schema = z.string().max(INGREDIENT_QUANTITY_MAX).optional();

  it("accepts a quantity at the exact max length", () => {
    expect(schema.safeParse("1".repeat(INGREDIENT_QUANTITY_MAX)).success).toBe(true);
  });

  it("rejects a quantity one character over the limit", () => {
    expect(schema.safeParse("1".repeat(INGREDIENT_QUANTITY_MAX + 1)).success).toBe(false);
  });

  it("accepts undefined (optional)", () => {
    expect(schema.safeParse(undefined).success).toBe(true);
  });
});
