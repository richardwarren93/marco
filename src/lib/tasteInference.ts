// Shared taste-inference helpers, extracted from TasteProfileOverlay so both
// the onboarding reveal and the profile "Retune my taste" flow compute scores
// identically. Pure functions over the curated RankingRecipe set — safe for
// client and server.

import type { RankingRecipe } from "@/components/onboarding/data/ranking-recipes";

export const CUISINE_FLAGS: Record<string, string> = {
  italian: "\u{1F1EE}\u{1F1F9}", thai: "\u{1F1F9}\u{1F1ED}", japanese: "\u{1F1EF}\u{1F1F5}",
  mexican: "\u{1F1F2}\u{1F1FD}", mediterranean: "\u{1F1EC}\u{1F1F7}", american: "\u{1F1FA}\u{1F1F8}",
  fusion: "\u{1F30D}", chinese: "\u{1F1E8}\u{1F1F3}", latin: "\u{1F1F5}\u{1F1EA}",
  asian: "\u{1F30F}",
};

export const CUISINE_LABELS: Record<string, string> = {
  asian: "Asian", latin: "Latin", mediterranean: "Mediterranean",
  italian: "Italian", american: "American", chinese: "Chinese",
  japanese: "Japanese", thai: "Thai", mexican: "Mexican", fusion: "Fusion",
};

/** Rank-weighted flavor scores, normalized 0–100 (higher rank = more weight). */
export function computeFlavorScores(rankedRecipes: RankingRecipe[]) {
  const scores = { sweet: 0, savory: 0, richness: 0, tangy: 0 };
  rankedRecipes.forEach((recipe, idx) => {
    const weight = rankedRecipes.length - idx; // higher rank = more weight
    if (!recipe.flavorWeights) return;
    scores.sweet += recipe.flavorWeights.sweet * weight;
    scores.savory += recipe.flavorWeights.savory * weight;
    scores.richness += recipe.flavorWeights.richness * weight;
    scores.tangy += recipe.flavorWeights.tangy * weight;
  });
  // Normalize to 0–100
  const max = Math.max(scores.sweet, scores.savory, scores.richness, scores.tangy, 1);
  return {
    sweet: Math.round((scores.sweet / max) * 100),
    savory: Math.round((scores.savory / max) * 100),
    richness: Math.round((scores.richness / max) * 100),
    tangy: Math.round((scores.tangy / max) * 100),
  };
}

/** Rank-weighted top-3 cuisines with display labels + flags. */
export function computeCuisineScores(rankedRecipes: RankingRecipe[]) {
  const scores: Record<string, number> = {};
  rankedRecipes.forEach((recipe, idx) => {
    const weight = rankedRecipes.length - idx;
    const c = recipe.cuisine;
    if (c) scores[c] = (scores[c] || 0) + weight;
  });
  return Object.entries(scores)
    .filter(([, s]) => s > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([id]) => ({
      id,
      label: CUISINE_LABELS[id] || id.charAt(0).toUpperCase() + id.slice(1),
      flag: CUISINE_FLAGS[id] || "\u{1F30D}",
    }));
}
