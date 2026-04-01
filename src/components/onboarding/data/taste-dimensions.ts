import type { SampleRecipe } from "./sample-recipes";

export interface TasteDimension {
  key: string;
  label: string;
  emoji: string;
  color: string;
  values: { id: string; label: string }[];
}

export const TASTE_DIMENSIONS: TasteDimension[] = [
  {
    key: "flavor",
    label: "Flavor Profile",
    emoji: "\u{1F525}",
    color: "#ef4444",
    values: [
      { id: "spicy", label: "Spicy" },
      { id: "sweet", label: "Sweet" },
      { id: "umami", label: "Umami" },
      { id: "tangy", label: "Tangy" },
      { id: "smoky", label: "Smoky" },
    ],
  },
  {
    key: "texture",
    label: "Texture Love",
    emoji: "\u{2728}",
    color: "#f59e0b",
    values: [
      { id: "crunchy", label: "Crunchy" },
      { id: "creamy", label: "Creamy" },
      { id: "chewy", label: "Chewy" },
      { id: "saucy", label: "Saucy" },
    ],
  },
  {
    key: "cuisine",
    label: "Cuisine Vibes",
    emoji: "\u{1F30D}",
    color: "#10b981",
    values: [
      { id: "italian", label: "Italian" },
      { id: "thai", label: "Thai" },
      { id: "japanese", label: "Japanese" },
      { id: "mexican", label: "Mexican" },
      { id: "mediterranean", label: "Mediterranean" },
      { id: "american", label: "American" },
      { id: "fusion", label: "Fusion" },
    ],
  },
  {
    key: "nutritional",
    label: "Nutrition Style",
    emoji: "\u{1F4AA}",
    color: "#6366f1",
    values: [
      { id: "high_protein", label: "High Protein" },
      { id: "low_carb", label: "Low Carb" },
      { id: "indulgent", label: "Indulgent" },
    ],
  },
  {
    key: "cookingStyle",
    label: "Cooking Style",
    emoji: "\u{1F373}",
    color: "#ec4899",
    values: [
      { id: "quick_meals", label: "Quick Meals" },
      { id: "one_pan", label: "One-Pan" },
      { id: "baked", label: "Baked" },
      { id: "grilled", label: "Grilled" },
    ],
  },
  {
    key: "ingredients",
    label: "Ingredient Vibes",
    emoji: "\u{1F33F}",
    color: "#14b8a6",
    values: [
      { id: "garlic_heavy", label: "Garlic Lover" },
      { id: "cheese_forward", label: "Cheese Forward" },
      { id: "herbaceous", label: "Herbaceous" },
    ],
  },
];

// Score a taste profile from liked recipes
export function scoreTasteProfile(
  likedRecipes: SampleRecipe[]
): Record<string, Record<string, number>> {
  const scores: Record<string, Record<string, number>> = {};

  for (const dim of TASTE_DIMENSIONS) {
    scores[dim.key] = {};
    for (const v of dim.values) {
      scores[dim.key][v.id] = 0;
    }
  }

  for (const recipe of likedRecipes) {
    const tags = recipe.tasteTags;
    if (tags.flavor) tags.flavor.forEach((f) => { if (scores.flavor[f] !== undefined) scores.flavor[f]++; });
    if (tags.texture) tags.texture.forEach((t) => { if (scores.texture[t] !== undefined) scores.texture[t]++; });
    if (tags.cuisine) tags.cuisine.forEach((c) => { if (scores.cuisine[c] !== undefined) scores.cuisine[c]++; });
    if (tags.nutritional) tags.nutritional.forEach((n) => { if (scores.nutritional[n] !== undefined) scores.nutritional[n]++; });
    if (tags.cookingStyle) tags.cookingStyle.forEach((s) => { if (scores.cookingStyle[s] !== undefined) scores.cookingStyle[s]++; });
    if (tags.ingredients) tags.ingredients.forEach((i) => { if (scores.ingredients[i] !== undefined) scores.ingredients[i]++; });
  }

  return scores;
}

// Get top traits from scores
export function getTopTraits(
  scores: Record<string, Record<string, number>>,
  maxPerDimension = 2
): { dimension: string; trait: string; label: string; score: number; emoji: string; color: string }[] {
  const traits: { dimension: string; trait: string; label: string; score: number; emoji: string; color: string }[] = [];

  for (const dim of TASTE_DIMENSIONS) {
    const dimScores = scores[dim.key];
    const sorted = Object.entries(dimScores)
      .filter(([, s]) => s > 0)
      .sort(([, a], [, b]) => b - a)
      .slice(0, maxPerDimension);

    for (const [traitId, score] of sorted) {
      const val = dim.values.find((v) => v.id === traitId);
      if (val) {
        traits.push({
          dimension: dim.label,
          trait: traitId,
          label: val.label,
          score,
          emoji: dim.emoji,
          color: dim.color,
        });
      }
    }
  }

  return traits.sort((a, b) => b.score - a.score);
}
