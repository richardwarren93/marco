import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const SWEET_KEYWORDS = ["sweet", "dessert", "honey", "sugar", "chocolate", "caramel", "vanilla", "maple", "fruit", "berry", "cake", "cookie", "pie", "custard", "syrup"];
const SAVORY_KEYWORDS = ["umami", "savory", "soy", "miso", "mushroom", "broth", "meaty", "bacon", "anchovy", "parmesan", "dashi", "fish sauce", "worcestershire", "steak", "roast"];
const RICHNESS_KEYWORDS = ["creamy", "cheese", "butter", "cream", "rich", "indulgent", "heavy", "coconut milk", "alfredo", "béchamel", "gratin", "fondue", "mac and cheese", "risotto"];
const TANGY_KEYWORDS = ["tangy", "citrus", "lemon", "lime", "vinegar", "sour", "pickled", "fermented", "yogurt", "kimchi", "sauerkraut", "ceviche", "tamarind", "sumac"];

interface RecipeRow {
  id: string;
  title: string;
  description: string | null;
  tags: string[] | null;
  ingredients: (string | { name: string })[] | null;
}

function countKeywordHits(text: string, keywords: string[]): number {
  const lower = text.toLowerCase();
  let hits = 0;
  for (const kw of keywords) {
    if (lower.includes(kw)) hits++;
  }
  return hits;
}

function recipeToText(recipe: RecipeRow): string {
  const parts: string[] = [recipe.title || ""];
  if (recipe.description) parts.push(recipe.description);
  if (recipe.tags) parts.push(...recipe.tags);
  if (recipe.ingredients) {
    for (const ing of recipe.ingredients) {
      if (typeof ing === "string") parts.push(ing);
      else if (ing && typeof ing === "object" && "name" in ing) parts.push(ing.name);
    }
  }
  return parts.join(" ");
}

function scoreRecipes(
  recipes: RecipeRow[],
  cookCounts: Map<string, number>,
  tasteProfile: Record<string, string[]> | null
) {
  const scores = { sweet: 0, savory: 0, richness: 0, tangy: 0 };

  for (const recipe of recipes) {
    const text = recipeToText(recipe);
    const weight = 1 + (cookCounts.get(recipe.id) || 0) * 0.5;

    scores.sweet += countKeywordHits(text, SWEET_KEYWORDS) * weight;
    scores.savory += countKeywordHits(text, SAVORY_KEYWORDS) * weight;
    scores.richness += countKeywordHits(text, RICHNESS_KEYWORDS) * weight;
    scores.tangy += countKeywordHits(text, TANGY_KEYWORDS) * weight;
  }

  // Add onboarding baseline boosts (only for "all" view, caller decides)
  if (tasteProfile) {
    // Prefer new unified scores if available (from updated onboarding)
    const storedScores = (tasteProfile as Record<string, unknown>).scores as { sweet?: number; savory?: number; richness?: number; tangy?: number } | undefined;
    if (storedScores) {
      const scaleFactor = 0.05;
      scores.sweet += (storedScores.sweet || 0) * scaleFactor;
      scores.savory += (storedScores.savory || 0) * scaleFactor;
      scores.richness += (storedScores.richness || 0) * scaleFactor;
      scores.tangy += (storedScores.tangy || 0) * scaleFactor;
    } else {
      // Fallback: map old trait-based profile to new dimensions
      const boostAmount = 3;
      if (tasteProfile.flavor?.includes("sweet")) scores.sweet += boostAmount;
      if (tasteProfile.flavor?.includes("umami")) scores.savory += boostAmount;
      if (tasteProfile.flavor?.includes("tangy")) scores.tangy += boostAmount;
      if (tasteProfile.texture?.includes("creamy")) scores.richness += boostAmount;
      if (tasteProfile.ingredients?.includes("cheese_forward")) scores.richness += boostAmount;
      if (tasteProfile.nutritional?.includes("indulgent")) scores.richness += boostAmount;
    }
  }

  // Normalize to 0–100
  const maxScore = Math.max(scores.sweet, scores.savory, scores.richness, scores.tangy, 1);
  const normalized = {
    sweet: Math.round((scores.sweet / maxScore) * 100),
    savory: Math.round((scores.savory / maxScore) * 100),
    richness: Math.round((scores.richness / maxScore) * 100),
    tangy: Math.round((scores.tangy / maxScore) * 100),
  };

  if (recipes.length > 0 || tasteProfile) {
    for (const key of Object.keys(normalized) as (keyof typeof normalized)[]) {
      if (normalized[key] > 0 && normalized[key] < 15) normalized[key] = 15;
    }
  }

  return normalized;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  // Fetch all data in parallel
  const [recipesRes, prefsRes, logsRes, mealPlansRes] = await Promise.all([
    admin.from("recipes").select("id, title, description, tags, ingredients").eq("user_id", user.id),
    admin.from("user_preferences").select("taste_profile").eq("user_id", user.id).single(),
    admin.from("cooking_logs").select("recipe_id").eq("user_id", user.id),
    admin.from("meal_plans").select("recipe_id, meal_type").eq("user_id", user.id).not("recipe_id", "is", null),
  ]);

  const recipes = (recipesRes.data || []) as RecipeRow[];
  const tasteProfile = prefsRes.data?.taste_profile as Record<string, string[]> | null;
  const cookingLogs = logsRes.data || [];
  const mealPlans = mealPlansRes.data || [];

  // Cook counts for weighting
  const cookCounts = new Map<string, number>();
  for (const log of cookingLogs) {
    cookCounts.set(log.recipe_id, (cookCounts.get(log.recipe_id) || 0) + 1);
  }

  // Recipe lookup
  const recipeMap = new Map<string, RecipeRow>();
  for (const r of recipes) recipeMap.set(r.id, r);

  // Collect unique recipe IDs planned for lunch and dinner
  const lunchIds = new Set<string>();
  const dinnerIds = new Set<string>();
  for (const mp of mealPlans) {
    if (!mp.recipe_id) continue;
    if (mp.meal_type === "lunch") lunchIds.add(mp.recipe_id);
    if (mp.meal_type === "dinner") dinnerIds.add(mp.recipe_id);
  }

  const lunchRecipes = [...lunchIds].map((id) => recipeMap.get(id)).filter(Boolean) as RecipeRow[];
  const dinnerRecipes = [...dinnerIds].map((id) => recipeMap.get(id)).filter(Boolean) as RecipeRow[];

  // Score all three views
  const all = scoreRecipes(recipes, cookCounts, tasteProfile);
  const lunch = scoreRecipes(lunchRecipes, cookCounts, null);
  const dinner = scoreRecipes(dinnerRecipes, cookCounts, null);

  return NextResponse.json({ all, lunch, dinner });
}
