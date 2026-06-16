import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Discover catalog. Builds a deduped community recipe catalog (same grouping as
 * /trending — group by normalized title, drop the user's own saves, keep only
 * usable images), attaches public rating aggregates, and returns:
 *
 *   - recommended  heuristic personal picks (taste match + tag overlap)
 *   - trending     most-saved across the community
 *   - categories   fixed browse buckets with live counts
 *   - results      the filtered list when q / filters are active (else null)
 *   - total        full catalog size
 *   - totalFiltered  size of the filtered list (drives "Show N recipes")
 *
 * Query params (all optional):
 *   q          free text over title/tags/ingredients
 *   meal_type  comma list: breakfast,lunch,dinner,snack
 *   dietary    comma list: vegetarian,vegan,gluten_free,dairy_free,low_carb
 *   max_time   number, total prep+cook minutes ceiling
 *   category   one category key (quick,dinner,vegetarian,comfort,low_carb,...)
 */

// ─── Taste keywords (mirrors /trending) ──────────────────────────────────────
const SWEET_KW = ["sweet", "dessert", "honey", "sugar", "chocolate", "caramel", "vanilla", "maple", "fruit", "berry", "cake", "cookie", "pie", "custard", "syrup"];
const SAVORY_KW = ["umami", "savory", "soy", "miso", "mushroom", "broth", "meaty", "bacon", "anchovy", "parmesan", "dashi", "fish sauce", "worcestershire", "steak", "roast"];
const RICHNESS_KW = ["creamy", "cheese", "butter", "cream", "rich", "indulgent", "heavy", "coconut milk", "alfredo", "béchamel", "gratin", "fondue", "mac and cheese", "risotto"];
const TANGY_KW = ["tangy", "citrus", "lemon", "lime", "vinegar", "sour", "pickled", "fermented", "yogurt", "kimchi", "sauerkraut", "ceviche", "tamarind", "sumac"];
const SPICY_KW = ["spicy", "chili", "chilli", "hot", "pepper", "jalapeño", "habanero", "sriracha", "gochujang", "harissa", "cayenne", "sichuan", "szechuan", "wasabi", "chipotle"];

function countHits(text: string, keywords: string[]): number {
  let hits = 0;
  for (const kw of keywords) if (text.includes(kw)) hits++;
  return hits;
}

function scoreTasteMatch(
  recipeText: string,
  userScores: { sweet: number; savory: number; richness: number; tangy: number; spicy: number }
): number {
  const text = recipeText.toLowerCase();
  const hits = {
    sweet: countHits(text, SWEET_KW),
    savory: countHits(text, SAVORY_KW),
    richness: countHits(text, RICHNESS_KW),
    tangy: countHits(text, TANGY_KW),
    spicy: countHits(text, SPICY_KW),
  };
  const totalHits = hits.sweet + hits.savory + hits.richness + hits.tangy + hits.spicy;
  if (totalHits === 0) return 50;
  let score = 0;
  let maxPossible = 0;
  for (const key of ["sweet", "savory", "richness", "tangy", "spicy"] as const) {
    const recipeWeight = hits[key] / totalHits;
    score += recipeWeight * userScores[key];
    maxPossible += recipeWeight * 100;
  }
  return maxPossible > 0 ? Math.round((score / maxPossible) * 100) : 50;
}

// ─── Dietary heuristics (keyword-based, matches the cook/dietary spirit) ──────
const MEAT_KW = ["beef", "steak", "veal", "lamb", "mutton", "goat", "pork", "ham", "bacon", "pancetta", "prosciutto", "sausage", "chorizo", "salami", "pepperoni", "chicken", "turkey", "duck", "venison", "meat"];
const SEAFOOD_KW = ["fish", "salmon", "tuna", "cod", "halibut", "trout", "shrimp", "prawn", "lobster", "crab", "scallop", "oyster", "clam", "mussel", "octopus", "squid", "calamari", "anchovy", "sardine"];
const DAIRY_KW = ["milk", "cheese", "butter", "cream", "yogurt", "yoghurt", "ghee", "parmesan", "mozzarella", "ricotta", "custard"];
const EGG_KW = ["egg", "eggs"];
const GLUTEN_KW = ["flour", "bread", "pasta", "noodle", "wheat", "barley", "couscous", "breadcrumb", "tortilla", "cracker", "soy sauce", "panko"];
const HIGH_CARB_KW = ["pasta", "noodle", "rice", "bread", "potato", "sugar", "flour", "tortilla", "couscous", "oats", "quinoa", "bun"];

function hasAny(text: string, keywords: string[]): boolean {
  return keywords.some((kw) => text.includes(kw));
}

type DietaryKey = "vegetarian" | "vegan" | "gluten_free" | "dairy_free" | "low_carb";

function matchesDietary(searchText: string, tags: string[], key: DietaryKey): boolean {
  const text = searchText.toLowerCase();
  const tagText = tags.join(" ").toLowerCase();
  switch (key) {
    case "vegetarian":
      if (tagText.includes("vegetarian") || tagText.includes("vegan")) return true;
      return !hasAny(text, MEAT_KW) && !hasAny(text, SEAFOOD_KW);
    case "vegan":
      if (tagText.includes("vegan")) return true;
      return !hasAny(text, MEAT_KW) && !hasAny(text, SEAFOOD_KW) && !hasAny(text, DAIRY_KW) && !hasAny(text, EGG_KW);
    case "gluten_free":
      if (tagText.includes("gluten")) return true;
      return !hasAny(text, GLUTEN_KW);
    case "dairy_free":
      if (tagText.includes("dairy free") || tagText.includes("dairy-free")) return true;
      return !hasAny(text, DAIRY_KW);
    case "low_carb":
      if (tagText.includes("low carb") || tagText.includes("low-carb") || tagText.includes("keto")) return true;
      return !hasAny(text, HIGH_CARB_KW);
  }
}

// ─── Browse categories ───────────────────────────────────────────────────────
interface CatalogItem {
  recipeId: string;
  title: string;
  image_url: string | null;
  tags: string[];
  meal_type: string;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  totalTime: number;
  saveCount: number;
  userCount: number;
  tasteMatch: number;
  recommendScore: number;
  searchText: string;
  rating: { average: number; count: number };
}

const CATEGORIES: { key: string; label: string; match: (r: CatalogItem) => boolean }[] = [
  { key: "quick", label: "Quick & Easy", match: (r) => r.totalTime > 0 && r.totalTime <= 30 },
  { key: "dinner", label: "Dinner", match: (r) => r.meal_type === "dinner" },
  { key: "vegetarian", label: "Vegetarian", match: (r) => matchesDietary(r.searchText, r.tags, "vegetarian") },
  { key: "comfort", label: "Comfort Food", match: (r) => hasAny(r.searchText.toLowerCase(), ["pasta", "cheese", "stew", "casserole", "mac and cheese", "soup", "pie", "roast", "mashed", "gratin", "lasagna", "risotto"]) },
  { key: "low_carb", label: "Low Carb", match: (r) => matchesDietary(r.searchText, r.tags, "low_carb") },
  { key: "breakfast", label: "Breakfast", match: (r) => r.meal_type === "breakfast" },
  { key: "dessert", label: "Sweets", match: (r) => hasAny(r.searchText.toLowerCase(), ["dessert", "cake", "cookie", "sweet", "chocolate", "pie", "ice cream", "brownie"]) },
];

const isUsableImage = (url: string | null): boolean => {
  if (!url) return false;
  const lower = url.toLowerCase();
  if (lower.includes("cdninstagram")) return false;
  if (lower.includes("scontent")) return false;
  if (lower.includes("tiktokcdn")) return false;
  return true;
};

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const sp = request.nextUrl.searchParams;
  const q = (sp.get("q") ?? "").trim().toLowerCase();
  const mealTypes = (sp.get("meal_type") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const dietary = (sp.get("dietary") ?? "").split(",").map((s) => s.trim()).filter(Boolean) as DietaryKey[];
  const maxTime = Number(sp.get("max_time")) || 0;
  const category = (sp.get("category") ?? "").trim();

  // Fetch catalog source + taste profile + the user's own recipes (tags/meal
  // for the recommend heuristic, titles to exclude) + all public ratings.
  const [recipesRes, prefsRes, myRecipesRes, ratingsRes] = await Promise.all([
    admin
      .from("recipes")
      .select("id, title, description, image_url, tags, meal_type, prep_time_minutes, cook_time_minutes, user_id, created_at, ingredients")
      .order("created_at", { ascending: false })
      .limit(2000),
    admin.from("user_preferences").select("taste_profile").eq("user_id", user.id).single(),
    admin.from("recipes").select("title, tags, meal_type").eq("user_id", user.id),
    admin.from("recipe_ratings").select("recipe_id, rating"),
  ]);

  const recipes = recipesRes.data ?? [];
  if (recipes.length === 0) {
    return NextResponse.json({ total: 0, totalFiltered: 0, recommended: [], trending: [], categories: [], results: null });
  }

  // User taste scores
  const tasteProfile = prefsRes.data?.taste_profile as Record<string, unknown> | null;
  const cachedProfile = tasteProfile?.cached_profile as { all?: Record<string, number> } | undefined;
  const userScores = {
    sweet: (cachedProfile?.all?.sweet as number) ?? 50,
    savory: (cachedProfile?.all?.savory as number) ?? 50,
    richness: (cachedProfile?.all?.richness as number) ?? 50,
    tangy: (cachedProfile?.all?.tangy as number) ?? 50,
    spicy: (cachedProfile?.all?.spicy as number) ?? 50,
  };

  // Build the user's saved-tag / meal-type frequency profile (recommend boost)
  // and the set of titles they already own (so we suggest only new things).
  const myTitles = new Set<string>();
  const tagFreq = new Map<string, number>();
  const mealFreq = new Map<string, number>();
  for (const r of myRecipesRes.data ?? []) {
    if (r.title) myTitles.add(r.title.toLowerCase().trim().replace(/[^\w\s]/g, ""));
    for (const t of (r.tags as string[] | null) ?? []) {
      const k = t.toLowerCase().trim();
      if (k) tagFreq.set(k, (tagFreq.get(k) ?? 0) + 1);
    }
    if (r.meal_type) mealFreq.set(r.meal_type, (mealFreq.get(r.meal_type) ?? 0) + 1);
  }
  const maxMeal = Math.max(1, ...mealFreq.values());

  // Rating aggregates by recipe_id
  const ratingMap = new Map<string, { sum: number; count: number }>();
  for (const row of (ratingsRes.data ?? []) as { recipe_id: string; rating: number }[]) {
    const cur = ratingMap.get(row.recipe_id) ?? { sum: 0, count: 0 };
    cur.sum += row.rating;
    cur.count += 1;
    ratingMap.set(row.recipe_id, cur);
  }

  // Group by normalized title (the "community recipe")
  const titleMap = new Map<string, {
    title: string; image_url: string | null; tags: string[]; meal_type: string;
    prep_time_minutes: number | null; cook_time_minutes: number | null;
    saveCount: number; users: Set<string>; recipeId: string; searchText: string;
  }>();

  for (const recipe of recipes) {
    const normalizedTitle = recipe.title.toLowerCase().trim().replace(/[^\w\s]/g, "");
    if (myTitles.has(normalizedTitle)) continue;

    const textParts = [recipe.title, recipe.description || "", ...((recipe.tags as string[]) || [])];
    if (recipe.ingredients) {
      for (const ing of recipe.ingredients as (string | { name: string })[]) {
        if (typeof ing === "string") textParts.push(ing);
        else if (ing && typeof ing === "object" && "name" in ing) textParts.push(ing.name);
      }
    }
    const searchText = textParts.join(" ");

    const existing = titleMap.get(normalizedTitle);
    if (existing) {
      existing.users.add(recipe.user_id);
      existing.saveCount++;
      if (!existing.image_url && recipe.image_url) {
        existing.image_url = recipe.image_url;
        existing.recipeId = recipe.id;
      }
      existing.searchText += " " + searchText;
    } else {
      titleMap.set(normalizedTitle, {
        title: recipe.title,
        image_url: recipe.image_url,
        tags: (recipe.tags as string[]) || [],
        meal_type: recipe.meal_type,
        prep_time_minutes: recipe.prep_time_minutes,
        cook_time_minutes: recipe.cook_time_minutes,
        saveCount: 1,
        users: new Set([recipe.user_id]),
        recipeId: recipe.id,
        searchText,
      });
    }
  }

  // Materialize the catalog with derived scores + ratings.
  const catalog: CatalogItem[] = [...titleMap.values()]
    .filter((r) => r.users.size >= 1 && isUsableImage(r.image_url))
    .map((r) => {
      const totalTime = (r.prep_time_minutes ?? 0) + (r.cook_time_minutes ?? 0);
      const tasteMatch = scoreTasteMatch(r.searchText, userScores);

      // Recommend score: taste match, boosted by overlap with the user's own
      // tags + favored meal types. Keeps it personal using data we already have.
      let tagBoost = 0;
      for (const t of r.tags) {
        const f = tagFreq.get(t.toLowerCase().trim());
        if (f) tagBoost += Math.min(f, 5);
      }
      const mealBoost = ((mealFreq.get(r.meal_type) ?? 0) / maxMeal) * 20;
      const recommendScore = tasteMatch + tagBoost * 4 + mealBoost;

      const ragg = ratingMap.get(r.recipeId);
      const rating = ragg
        ? { average: Math.round((ragg.sum / ragg.count) * 10) / 10, count: ragg.count }
        : { average: 0, count: 0 };

      return {
        recipeId: r.recipeId,
        title: r.title,
        image_url: r.image_url,
        tags: r.tags,
        meal_type: r.meal_type,
        prep_time_minutes: r.prep_time_minutes,
        cook_time_minutes: r.cook_time_minutes,
        totalTime,
        saveCount: r.saveCount,
        userCount: r.users.size,
        tasteMatch,
        recommendScore,
        searchText: r.searchText,
        rating,
      };
    });

  // Category counts over the full catalog.
  const categories = CATEGORIES.map((c) => ({
    key: c.key,
    label: c.label,
    count: catalog.filter((r) => c.match(r)).length,
  })).filter((c) => c.count > 0);

  // Apply active filters.
  const hasFilters = !!(q || mealTypes.length || dietary.length || maxTime || category);
  let filtered = catalog;
  if (q) {
    filtered = filtered.filter((r) => r.searchText.toLowerCase().includes(q) || r.title.toLowerCase().includes(q));
  }
  if (mealTypes.length) {
    filtered = filtered.filter((r) => mealTypes.includes(r.meal_type));
  }
  if (dietary.length) {
    filtered = filtered.filter((r) => dietary.every((d) => matchesDietary(r.searchText, r.tags, d)));
  }
  if (maxTime > 0) {
    filtered = filtered.filter((r) => r.totalTime > 0 && r.totalTime <= maxTime);
  }
  if (category) {
    const cat = CATEGORIES.find((c) => c.key === category);
    if (cat) filtered = filtered.filter((r) => cat.match(r));
  }

  const strip = (r: CatalogItem) => ({
    recipeId: r.recipeId,
    title: r.title,
    image_url: r.image_url,
    tags: r.tags,
    meal_type: r.meal_type,
    prep_time_minutes: r.prep_time_minutes,
    cook_time_minutes: r.cook_time_minutes,
    totalTime: r.totalTime,
    saveCount: r.saveCount,
    userCount: r.userCount,
    rating: r.rating,
  });

  const recommended = [...catalog]
    .sort((a, b) => b.recommendScore - a.recommendScore || b.userCount - a.userCount)
    .slice(0, 12)
    .map(strip);

  const trending = [...catalog]
    .sort((a, b) => b.userCount - a.userCount || b.saveCount - a.saveCount || b.tasteMatch - a.tasteMatch)
    .slice(0, 12)
    .map(strip);

  const results = hasFilters
    ? [...filtered]
        .sort((a, b) => b.userCount - a.userCount || b.rating.average - a.rating.average || b.saveCount - a.saveCount)
        .slice(0, 60)
        .map(strip)
    : null;

  return NextResponse.json(
    {
      total: catalog.length,
      totalFiltered: filtered.length,
      recommended,
      trending,
      categories,
      results,
    },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
