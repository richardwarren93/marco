import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── Flavor keywords ─────────────────────────────────────────────────────────
const SWEET_KEYWORDS = ["sweet", "dessert", "honey", "sugar", "chocolate", "caramel", "vanilla", "maple", "fruit", "berry", "cake", "cookie", "pie", "custard", "syrup"];
const SAVORY_KEYWORDS = ["umami", "savory", "soy", "miso", "mushroom", "broth", "meaty", "bacon", "anchovy", "parmesan", "dashi", "fish sauce", "worcestershire", "steak", "roast"];
const RICHNESS_KEYWORDS = ["creamy", "cheese", "butter", "cream", "rich", "indulgent", "heavy", "coconut milk", "alfredo", "béchamel", "gratin", "fondue", "mac and cheese", "risotto"];
const TANGY_KEYWORDS = ["tangy", "citrus", "lemon", "lime", "vinegar", "sour", "pickled", "fermented", "yogurt", "kimchi", "sauerkraut", "ceviche", "tamarind", "sumac"];
const SPICY_KEYWORDS = ["spicy", "chili", "chilli", "hot", "pepper", "jalapeño", "habanero", "sriracha", "gochujang", "harissa", "cayenne", "mala", "sichuan", "szechuan", "wasabi", "horseradish", "ghost pepper", "chipotle"];

interface RecipeRow {
  id: string;
  title: string;
  description: string | null;
  tags: string[] | null;
  ingredients: (string | { name: string })[] | null;
  meal_type: string | null;
}

// ─── Cuisine detection ──────────────────────────────────────────────────────
const CUISINE_MAP: { cuisine: string; label: string; flag: string; keywords: string[] }[] = [
  { cuisine: "italian", label: "Italian", flag: "\u{1F1EE}\u{1F1F9}", keywords: ["italian", "pasta", "risotto", "pizza", "alfredo", "lasagna", "pesto", "gnocchi", "bruschetta", "tiramisu", "prosciutto", "parmigiana", "carbonara", "bolognese", "marinara"] },
  { cuisine: "asian", label: "Asian", flag: "\u{1F30F}", keywords: ["asian", "chinese", "japanese", "korean", "thai", "vietnamese", "sushi", "ramen", "stir fry", "wok", "teriyaki", "dim sum", "pho", "pad thai", "curry", "kimchi", "miso", "soy sauce", "tofu", "dumplings", "sichuan", "szechuan", "bibimbap", "bulgogi"] },
  { cuisine: "mediterranean", label: "Mediterranean", flag: "\u{1F1EC}\u{1F1F7}", keywords: ["mediterranean", "greek", "hummus", "falafel", "shawarma", "tabbouleh", "tahini", "tzatziki", "olive oil", "pita", "couscous", "shakshuka", "za'atar", "sumac"] },
  { cuisine: "latin", label: "Latin", flag: "\u{1F1F5}\u{1F1EA}", keywords: ["latin", "mexican", "peruvian", "brazilian", "cuban", "taco", "burrito", "ceviche", "empanada", "churros", "salsa", "guacamole", "enchilada", "quesadilla", "tamale", "arepa", "mole"] },
  { cuisine: "american", label: "American", flag: "\u{1F1FA}\u{1F1F8}", keywords: ["american", "burger", "bbq", "barbecue", "wings", "mac and cheese", "fried chicken", "brisket", "cornbread", "coleslaw", "hot dog", "meatloaf", "pot roast", "clam chowder"] },
  { cuisine: "indian", label: "Indian", flag: "\u{1F1EE}\u{1F1F3}", keywords: ["indian", "curry", "masala", "tandoori", "naan", "biryani", "dal", "paneer", "tikka", "samosa", "chutney", "vindaloo", "korma", "garam"] },
  { cuisine: "french", label: "French", flag: "\u{1F1EB}\u{1F1F7}", keywords: ["french", "croissant", "ratatouille", "soufflé", "crème", "baguette", "béarnaise", "béchamel", "bouillabaisse", "coq au vin", "crêpe", "quiche", "confit"] },
];

// ─── Cooking style detection ────────────────────────────────────────────────
const COOKING_STYLE_MAP: { style: string; label: string; emoji: string; keywords: string[] }[] = [
  { style: "quick_meals", label: "Quick Meals", emoji: "\u{23F1}\uFE0F", keywords: ["quick", "easy", "15 min", "20 min", "simple", "weeknight", "no-cook"] },
  { style: "one_pan", label: "One-Pan", emoji: "\u{1F373}", keywords: ["one pan", "one pot", "sheet pan", "skillet", "one-pan", "one-pot"] },
  { style: "baked", label: "Baked", emoji: "\u{1F36A}", keywords: ["baked", "bake", "roasted", "oven", "casserole", "gratin"] },
  { style: "grilled", label: "Grilled", emoji: "\u{1F525}", keywords: ["grilled", "grill", "bbq", "barbecue", "charred", "smoky", "smoked"] },
  { style: "slow_cooked", label: "Slow Cooked", emoji: "\u{1F372}", keywords: ["slow cook", "slow-cook", "braise", "braised", "stew", "simmer", "crockpot"] },
];

// ─── Chef matching ──────────────────────────────────────────────────────────
const CHEF_MATCHES: { keywords: string[]; chef: { name: string; description: string } }[] = [
  { keywords: ["spicy", "savory", "asian", "garlic"], chef: { name: "David Chang", description: "Bold, boundary-pushing flavors with deep umami and fearless spice \u{2014} you cook like the Momofuku mastermind." } },
  { keywords: ["smoky", "grilled", "american", "savory"], chef: { name: "Aaron Franklin", description: "Low and slow with smoke-kissed perfection \u{2014} you share a soul with the king of Texas BBQ." } },
  { keywords: ["richness", "savory", "italian", "creamy"], chef: { name: "Ina Garten", description: "Rich, comforting, and effortlessly elegant \u{2014} your taste mirrors the Barefoot Contessa herself." } },
  { keywords: ["tangy", "mediterranean", "quick_meals", "fresh"], chef: { name: "Yotam Ottolenghi", description: "Fresh, vibrant, and layered with herbs \u{2014} your palate echoes the master of modern Mediterranean." } },
  { keywords: ["sweet", "baked", "richness", "tangy"], chef: { name: "Samin Nosrat", description: "Salt, fat, acid, heat \u{2014} you instinctively balance flavors like the author who taught a generation to cook." } },
  { keywords: ["savory", "one_pan", "quick_meals", "garlic"], chef: { name: "Kenji L\u{00F3}pez-Alt", description: "Science-driven, flavor-maximizing, and no-fuss \u{2014} you cook like the Food Lab genius." } },
  { keywords: ["spicy", "asian", "latin", "sweet"], chef: { name: "Roy Choi", description: "Street food energy with global flavors \u{2014} your taste runs on the same fuel as the Kogi truck pioneer." } },
  { keywords: ["tangy", "mediterranean", "fresh", "light"], chef: { name: "Alice Waters", description: "Farm-fresh, seasonal, and beautifully simple \u{2014} you channel the mother of California cuisine." } },
  { keywords: ["indian", "spicy", "richness", "slow_cooked"], chef: { name: "Madhur Jaffrey", description: "Aromatic spice layering with bold, soulful depth \u{2014} your palate channels the queen of Indian cooking." } },
];

// ─── Helper functions ───────────────────────────────────────────────────────

function countKeywordHits(text: string, keywords: string[]): number {
  const lower = text.toLowerCase();
  let hits = 0;
  for (const kw of keywords) if (lower.includes(kw)) hits++;
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
  tasteProfile: Record<string, string[]> | null,
  ratings?: Map<string, number>,
  learnedInsights?: Record<string, string[]> | null
) {
  const scores = { sweet: 0, savory: 0, richness: 0, tangy: 0, spicy: 0 };

  for (const recipe of recipes) {
    const text = recipeToText(recipe);
    let weight = 1 + (cookCounts.get(recipe.id) || 0) * 0.5;
    if (ratings?.has(recipe.id)) {
      const rating = ratings.get(recipe.id)!;
      if (rating >= 4) weight *= 1.5;
      else if (rating <= 2) weight *= 0.3;
    }
    scores.sweet += countKeywordHits(text, SWEET_KEYWORDS) * weight;
    scores.savory += countKeywordHits(text, SAVORY_KEYWORDS) * weight;
    scores.richness += countKeywordHits(text, RICHNESS_KEYWORDS) * weight;
    scores.tangy += countKeywordHits(text, TANGY_KEYWORDS) * weight;
    scores.spicy += countKeywordHits(text, SPICY_KEYWORDS) * weight;
  }

  if (tasteProfile) {
    const storedScores = (tasteProfile as Record<string, unknown>).scores as { sweet?: number; savory?: number; richness?: number; tangy?: number; spicy?: number } | undefined;
    if (storedScores) {
      const sf = 0.05;
      scores.sweet += (storedScores.sweet || 0) * sf;
      scores.savory += (storedScores.savory || 0) * sf;
      scores.richness += (storedScores.richness || 0) * sf;
      scores.tangy += (storedScores.tangy || 0) * sf;
      scores.spicy += (storedScores.spicy || 0) * sf;
    } else {
      const b = 3;
      if (tasteProfile.flavor?.includes("sweet")) scores.sweet += b;
      if (tasteProfile.flavor?.includes("umami")) scores.savory += b;
      if (tasteProfile.flavor?.includes("tangy")) scores.tangy += b;
      if (tasteProfile.flavor?.includes("spicy")) scores.spicy += b;
      if (tasteProfile.texture?.includes("creamy")) scores.richness += b;
      if (tasteProfile.ingredients?.includes("cheese_forward")) scores.richness += b;
      if (tasteProfile.nutritional?.includes("indulgent")) scores.richness += b;
    }
  }

  if (learnedInsights) {
    const ba = 2;
    const likeText = [...(learnedInsights.likes || []), ...(learnedInsights.flavor_preferences || [])].join(" ").toLowerCase();
    if (likeText) {
      scores.sweet += countKeywordHits(likeText, SWEET_KEYWORDS) * ba;
      scores.savory += countKeywordHits(likeText, SAVORY_KEYWORDS) * ba;
      scores.richness += countKeywordHits(likeText, RICHNESS_KEYWORDS) * ba;
      scores.tangy += countKeywordHits(likeText, TANGY_KEYWORDS) * ba;
      scores.spicy += countKeywordHits(likeText, SPICY_KEYWORDS) * ba;
    }
    const dislikeText = (learnedInsights.dislikes || []).join(" ").toLowerCase();
    if (dislikeText) {
      scores.sweet -= countKeywordHits(dislikeText, SWEET_KEYWORDS) * ba;
      scores.savory -= countKeywordHits(dislikeText, SAVORY_KEYWORDS) * ba;
      scores.richness -= countKeywordHits(dislikeText, RICHNESS_KEYWORDS) * ba;
      scores.tangy -= countKeywordHits(dislikeText, TANGY_KEYWORDS) * ba;
      scores.spicy -= countKeywordHits(dislikeText, SPICY_KEYWORDS) * ba;
    }
  }

  for (const key of Object.keys(scores) as (keyof typeof scores)[]) {
    if (scores[key] < 0) scores[key] = 0;
  }

  const maxScore = Math.max(scores.sweet, scores.savory, scores.richness, scores.tangy, scores.spicy, 1);
  const normalized = {
    sweet: Math.round((scores.sweet / maxScore) * 100),
    savory: Math.round((scores.savory / maxScore) * 100),
    richness: Math.round((scores.richness / maxScore) * 100),
    tangy: Math.round((scores.tangy / maxScore) * 100),
    spicy: Math.round((scores.spicy / maxScore) * 100),
  };

  if (recipes.length > 0 || tasteProfile) {
    for (const key of Object.keys(normalized) as (keyof typeof normalized)[]) {
      if (normalized[key] > 0 && normalized[key] < 15) normalized[key] = 15;
    }
  }

  return normalized;
}

function detectCuisines(recipes: RecipeRow[], cookCounts: Map<string, number>) {
  const scores: Record<string, number> = {};
  for (const recipe of recipes) {
    const text = recipeToText(recipe).toLowerCase();
    const weight = 1 + (cookCounts.get(recipe.id) || 0) * 0.5;
    for (const cm of CUISINE_MAP) {
      let hits = 0;
      for (const kw of cm.keywords) if (text.includes(kw)) hits++;
      if (hits > 0) scores[cm.cuisine] = (scores[cm.cuisine] || 0) + hits * weight;
    }
  }
  return Object.entries(scores)
    .filter(([, s]) => s > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([id]) => {
      const cm = CUISINE_MAP.find((c) => c.cuisine === id);
      return { id, label: cm?.label || id, flag: cm?.flag || "\u{1F30D}" };
    });
}

function detectCookingStyles(recipes: RecipeRow[], cookCounts: Map<string, number>) {
  const scores: Record<string, number> = {};
  for (const recipe of recipes) {
    const text = recipeToText(recipe).toLowerCase();
    const weight = 1 + (cookCounts.get(recipe.id) || 0) * 0.5;
    for (const sm of COOKING_STYLE_MAP) {
      let hits = 0;
      for (const kw of sm.keywords) if (text.includes(kw)) hits++;
      if (hits > 0) scores[sm.style] = (scores[sm.style] || 0) + hits * weight;
    }
  }
  const quickCount = recipes.filter((r) => {
    const tags = (r.tags || []).join(" ").toLowerCase();
    return tags.includes("quick") || tags.includes("easy");
  }).length;
  if (quickCount >= 2) scores.quick_meals = (scores.quick_meals || 0) + quickCount;

  return Object.entries(scores)
    .filter(([, s]) => s > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4)
    .map(([id]) => {
      const sm = COOKING_STYLE_MAP.find((s) => s.style === id);
      return { id, label: sm?.label || id, emoji: sm?.emoji || "\u{1F374}" };
    });
}

function matchChef(
  flavorScores: Record<string, number>,
  cuisines: { id: string }[],
  cookingStyles: { id: string }[]
) {
  const signals = new Set<string>();
  for (const [key, val] of Object.entries(flavorScores).sort(([, a], [, b]) => b - a)) {
    if (val > 30) signals.add(key);
  }
  for (const c of cuisines) signals.add(c.id);
  for (const s of cookingStyles) signals.add(s.id);

  let bestMatch = CHEF_MATCHES[0].chef;
  let bestScore = 0;
  for (const entry of CHEF_MATCHES) {
    let score = 0;
    for (const kw of entry.keywords) if (signals.has(kw)) score++;
    if (score > bestScore) { bestScore = score; bestMatch = entry.chef; }
  }
  return bestMatch;
}

function generateInsights(
  flavorScores: Record<string, number>,
  cuisines: { id: string; label: string }[],
  cookingStyles: { id: string; label: string }[]
): { emoji: string; text: string }[] {
  const items: { emoji: string; text: string }[] = [];
  const topFlavors = Object.entries(flavorScores)
    .filter(([, v]) => v > 20)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 2)
    .map(([k]) => k);
  if (topFlavors.length > 0) items.push({ emoji: "\u{1F525}", text: `Crave ${topFlavors.join(" & ")} flavors` });
  if (cuisines.length > 0) items.push({ emoji: "\u{1F30D}", text: `Love ${cuisines[0].label} food` });
  if (cookingStyles.length > 0) items.push({ emoji: "\u{23F1}\uFE0F", text: `Lean toward ${cookingStyles[0].label.toLowerCase()} cooking` });
  if (flavorScores.richness > 50) items.push({ emoji: "\u{2728}", text: "Love rich, creamy textures" });
  else if (flavorScores.tangy > 50) items.push({ emoji: "\u{1F34B}", text: "Drawn to bright, tangy dishes" });
  return items.slice(0, 4);
}

// ─── Cache helpers ──────────────────────────────────────────────────────────

/** Get the most recent "every other Monday" refresh date */
function getLastRefreshDate(): string {
  // Epoch Monday: Jan 6, 2025 (a known Monday)
  const epochMonday = new Date("2025-01-06T00:00:00Z");
  const now = new Date();
  const msSinceEpoch = now.getTime() - epochMonday.getTime();
  const daysSinceEpoch = Math.floor(msSinceEpoch / (1000 * 60 * 60 * 24));
  // Every other Monday = every 14 days from epoch Monday
  const periodsElapsed = Math.floor(daysSinceEpoch / 14);
  const lastRefresh = new Date(epochMonday.getTime() + periodsElapsed * 14 * 24 * 60 * 60 * 1000);
  return lastRefresh.toISOString();
}

interface CachedProfile {
  all: Record<string, number>;
  cuisines: { id: string; label: string; flag: string }[];
  cookingStyles: { id: string; label: string; emoji: string }[];
  chef: { name: string; description: string };
  insights: { emoji: string; text: string }[];
  signatureMeals: { title: string; count: number }[];
  lastComputed: string;
}

// ─── GET handler ────────────────────────────────────────────────────────────

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  // Check for cached profile
  const { data: prefsData } = await admin
    .from("user_preferences")
    .select("taste_profile, meal_planning_priority")
    .eq("user_id", user.id)
    .single();

  const tasteProfile = prefsData?.taste_profile as Record<string, unknown> | null;
  const cached = tasteProfile?.cached_profile as CachedProfile | undefined;
  const currentRefreshDate = getLastRefreshDate();

  const priority = (prefsData?.meal_planning_priority as string) || null;

  // Return cached data if it was computed during the current 2-week period
  if (cached && cached.lastComputed >= currentRefreshDate) {
    return NextResponse.json({
      all: cached.all,
      cuisines: cached.cuisines,
      cookingStyles: cached.cookingStyles,
      chef: cached.chef,
      insights: cached.insights,
      signatureMeals: cached.signatureMeals,
      priority,
    });
  }

  // ── Recompute: cache is stale or doesn't exist ──

  const [recipesRes, logsRes, mealPlansRes, ratingsRes] = await Promise.all([
    admin.from("recipes").select("id, title, description, tags, ingredients, meal_type").eq("user_id", user.id),
    admin.from("cooking_logs").select("recipe_id").eq("user_id", user.id),
    admin.from("meal_plans").select("recipe_id, meal_type").eq("user_id", user.id).not("recipe_id", "is", null),
    admin.from("recipe_notes").select("recipe_id, rating").eq("user_id", user.id).not("rating", "is", null),
  ]);

  const recipes = (recipesRes.data || []) as RecipeRow[];
  const cookingLogs = logsRes.data || [];
  const mealPlans = mealPlansRes.data || [];
  const learnedInsights = tasteProfile?.learned_insights as Record<string, string[]> | null;

  const ratingsMap = new Map<string, number>();
  for (const r of ratingsRes.data || []) ratingsMap.set(r.recipe_id, r.rating);

  const cookCounts = new Map<string, number>();
  for (const log of cookingLogs) cookCounts.set(log.recipe_id, (cookCounts.get(log.recipe_id) || 0) + 1);

  const recipeMap = new Map<string, RecipeRow>();
  for (const r of recipes) recipeMap.set(r.id, r);

  // Compute all scores
  const all = scoreRecipes(recipes, cookCounts, tasteProfile as Record<string, string[]> | null, ratingsMap, learnedInsights);
  const cuisines = detectCuisines(recipes, cookCounts);
  const cookingStyles = detectCookingStyles(recipes, cookCounts);
  const chef = matchChef(all, cuisines, cookingStyles);
  const insights = generateInsights(all, cuisines, cookingStyles);

  // Signature Meals — most frequently planned
  const planCounts = new Map<string, number>();
  for (const mp of mealPlans) {
    if (mp.recipe_id) planCounts.set(mp.recipe_id, (planCounts.get(mp.recipe_id) || 0) + 1);
  }
  const signatureMeals = [...planCounts.entries()]
    .filter(([, count]) => count >= 2)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([recipeId, count]) => {
      const recipe = recipeMap.get(recipeId);
      return recipe ? { title: recipe.title, count } : null;
    })
    .filter(Boolean) as { title: string; count: number }[];

  // Cache the computed profile
  const newCached: CachedProfile = {
    all,
    cuisines,
    cookingStyles,
    chef,
    insights,
    signatureMeals,
    lastComputed: new Date().toISOString(),
  };

  // Store cache in taste_profile JSONB (preserving other fields)
  await admin
    .from("user_preferences")
    .update({
      taste_profile: {
        ...(tasteProfile || {}),
        cached_profile: newCached,
      },
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);

  return NextResponse.json({
    all,
    cuisines,
    cookingStyles,
    chef,
    insights,
    signatureMeals,
    priority,
  });
}
